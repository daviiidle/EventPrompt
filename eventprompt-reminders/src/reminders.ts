import { supabaseFetch } from "./supabase";
import { sendSms } from "./twilio";
import { resolveSendTo, type Env } from "./utils";

interface ReminderRow {
  id: number | string;
  reminder_step: number;
  next_reminder_at?: string | null;
  households?: Household | null;
}

interface Household {
  id: number | string;
  household_name?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  sms_opt_out?: boolean | null;
  rsvp_attending?: boolean | null;
  events?: Event | null;
}

interface Event {
  event_date?: string | null;
  tier?: string | null;
}

export async function fetchDueReminders(
  env: Env,
  limit = 5
): Promise<ReminderRow[]> {
  const now = new Date().toISOString();
  const requireUnresponded =
    String(env.REQUIRE_UNRESPONDED_ONLY || "").toLowerCase() === "true";

  const res = await supabaseFetch(
    env,
    `reminder_state?` +
      `status=eq.active&` +
      `next_reminder_at=lte.${now}&` +
      `order=next_reminder_at.asc&` +
      `limit=${limit}&` +
      `select=*,households(*,events(*))`
  );

  if (!res.ok) {
    throw new Error(`Fetch reminders failed: ${await res.text()}`);
  }

  const rows = (await res.json()) as ReminderRow[];

  return rows.filter((r) => {
    const h = r.households;
    if (!h) return false;

    if (requireUnresponded && h.rsvp_attending !== null && h.rsvp_attending !== undefined) {
      return false;
    }

    if (!h.phone_e164 && !h.email) return false;

    return true;
  });
}

export function nextStep(step: number): number | null {
  if (step === 21) return 10;
  if (step === 10) return 3;
  return null;
}

export function buildMessage(args: {
  household: Household;
  event: Event;
  reminderStep: number;
}): string {
  const eventDate = args.event?.event_date ?? "(unknown date)";
  const hh = args.household?.household_name ?? "there";

  return `Hi ${hh} — reminder (${args.reminderStep}): your event is on ${eventDate}. Please RSVP via your link.`;
}

export function computeNextReminderAtUtcISO(
  eventDateStr: string,
  daysBefore: number
): string {
  const base = new Date(`${eventDateStr}T00:00:00.000Z`);
  const ms = base.getTime() - daysBefore * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export async function logSmsBackwardCompatible(
  env: Env,
  payload: {
    household_id: number | string;
    reminder_step?: number;
    provider_message_id?: string | null;
    to_e164: string;
    body: string;
    status: string;
    error_code?: string | null;
    error_message?: string | null;
  }
): Promise<void> {
  const attempts = [
    {
      household_id: payload.household_id,
      to_e164: payload.to_e164,
      body: payload.body,
      status: payload.status,
      provider_message_id: payload.provider_message_id ?? null,
      error_code: payload.error_code ?? null,
      error_message: payload.error_message ?? null,
    },
    {
      household_id: payload.household_id,
      reminder_step: payload.reminder_step,
      twilio_sid: payload.provider_message_id,
      to_number: payload.to_e164,
      body: payload.body,
      status: payload.status,
    },
    {
      household_id: payload.household_id,
      to_e164: payload.to_e164,
      body: payload.body,
      status: payload.status,
    },
  ];

  let lastErr: string | null = null;

  for (const body of attempts) {
    const res = await supabaseFetch(env, "sms_messages", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res.ok) return;

    lastErr = await res.text();
  }

  throw new Error(
    `sms_messages insert failed (all attempts). Last error: ${lastErr}`
  );
}

export async function logEmailMessage(
  env: Env,
  payload: {
    household_id: number | string;
    reminder_step?: number;
    to_email: string;
    subject: string;
    body: string;
    status: string;
    provider_message_id?: string | null;
    error_code?: string | null;
    error_message?: string | null;
  }
): Promise<void> {
  const res = await supabaseFetch(env, "email_messages", {
    method: "POST",
    body: JSON.stringify({
      household_id: payload.household_id,
      reminder_step: payload.reminder_step,
      to_email: payload.to_email,
      subject: payload.subject,
      body: payload.body,
      status: payload.status,
      provider_message_id: payload.provider_message_id ?? null,
      error_code: payload.error_code ?? null,
      error_message: payload.error_message ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error(`email_messages insert failed: ${await res.text()}`);
  }
}

export async function emailMessageExists(
  env: Env,
  householdId: number | string,
  reminderStep: number
): Promise<boolean> {
  const res = await supabaseFetch(
    env,
    `email_messages?household_id=eq.${householdId}&reminder_step=eq.${reminderStep}&select=id&limit=1`
  );

  if (!res.ok) {
    throw new Error(`email_messages lookup failed: ${await res.text()}`);
  }

  const rows = (await res.json()) as Array<{ id?: string }>;
  return rows.length > 0;
}

export async function processDueReminders(
  env: Env,
  limit = 3
): Promise<
  Array<{ reminder_id: number | string; sent: boolean; error?: string }>
> {
  const reminders = await fetchDueReminders(env, limit);
  const results: Array<{
    reminder_id: number | string;
    sent: boolean;
    error?: string;
  }> = [];

  const claimReminder = async (reminderId: number | string) => {
    const res = await supabaseFetch(env, `reminder_state?id=eq.${reminderId}&status=eq.active`, {
      method: "PATCH",
      body: JSON.stringify({ status: "processing" }),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ id?: string }>;
    return rows.length > 0;
  };

  const markActive = async (reminderId: number | string) => {
    await supabaseFetch(env, `reminder_state?id=eq.${reminderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    });
  };

  const markCompleted = async (reminderId: number | string) => {
    await supabaseFetch(env, `reminder_state?id=eq.${reminderId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        next_reminder_at: null,
      }),
    });
  };

  const advanceReminder = async (reminderId: number | string, next: number, nextAt: string) => {
    await supabaseFetch(env, `reminder_state?id=eq.${reminderId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "active",
        reminder_step: next,
        next_reminder_at: nextAt,
      }),
    });
  };

  for (const r of reminders) {
    const reminderId = r.id;

    const claimed = await claimReminder(reminderId);
    if (!claimed) {
      results.push({ reminder_id: reminderId, sent: false });
      continue;
    }

    try {
      const household = r.households;
      const event = household?.events;

      if (!household || !event) {
        throw new Error("Missing households/events join data");
      }

      const isPremium = String(event.tier || "").toLowerCase() === "premium";
      const message = buildMessage({
        household,
        event,
        reminderStep: r.reminder_step,
      });

      const canEmail = !!household.email;
      const canSms =
        isPremium && !!household.phone_e164 && household.sms_opt_out !== true;

      if (canEmail) {
        const alreadyQueued = await emailMessageExists(
          env,
          household.id,
          r.reminder_step
        );
        if (!alreadyQueued) {
          await logEmailMessage(env, {
            household_id: household.id,
            reminder_step: r.reminder_step,
            to_email: household.email,
            subject: "Event reminder",
            body: message,
            status: "queued",
          });
        }
      }

      if (!canSms) {
        if (!canEmail) {
          await markCompleted(reminderId);
          results.push({ reminder_id: reminderId, sent: false });
          continue;
        }

        const next = nextStep(r.reminder_step);
        if (next) {
          const eventDate = event.event_date;
          if (!eventDate) throw new Error("Missing event_date");

          const nextAt = computeNextReminderAtUtcISO(eventDate, next);
          await advanceReminder(reminderId, next, nextAt);
        } else {
          await markCompleted(reminderId);
        }

        results.push({ reminder_id: reminderId, sent: true });
        continue;
      }

      const to = resolveSendTo(env, household.phone_e164);
      const sms = await sendSms(env, to, message);

      await logSmsBackwardCompatible(env, {
        household_id: household.id,
        reminder_step: r.reminder_step,
        provider_message_id: sms.sid,
        to_e164: to,
        body: message,
        status: "sent",
      });

      const next = nextStep(r.reminder_step);

      if (next) {
        const eventDate = event.event_date;
        if (!eventDate) throw new Error("Missing event_date");

        const daysBefore = next;
        const nextAt = computeNextReminderAtUtcISO(eventDate, daysBefore);

        await advanceReminder(reminderId, next, nextAt);
      } else {
        await markCompleted(reminderId);
      }

      results.push({ reminder_id: reminderId, sent: true });
    } catch (err) {
      try {
        const household = r.households;
        const to = household?.phone_e164
          ? resolveSendTo(env, household.phone_e164)
          : null;

        if (household?.id && to) {
          await logSmsBackwardCompatible(env, {
            household_id: household.id,
            reminder_step: r.reminder_step,
            provider_message_id: null,
            to_e164: to,
            body: `FAILED: ${String((err as Error)?.message || err)}`,
            status: "failed",
            error_message: String((err as Error)?.message || err),
          });
        }
      } catch {
        // ignore logging errors
      }

      results.push({
        reminder_id: reminderId,
        sent: false,
        error: String((err as Error)?.message || err),
      });
      await markActive(reminderId);
    }
  }

  return results;
}
