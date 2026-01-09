import { supabaseFetch } from "./supabase";
import { sendSms } from "./twilio";
import { resolveSendTo, type Env } from "./utils";

interface ReminderRow {
  id: number | string;
  reminder_step: number;
  next_reminder_at?: string | null;
  households?: any;
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

    if (h.sms_opt_out === true) return false;

    if (requireUnresponded && h.rsvp_attending !== null && h.rsvp_attending !== undefined) {
      return false;
    }

    if (!h.phone_e164) return false;

    return true;
  });
}

export function nextStep(step: number): number | null {
  if (step === 21) return 10;
  if (step === 10) return 3;
  return null;
}

export function buildMessage(args: {
  household: any;
  event: any;
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

  for (const r of reminders) {
    const reminderId = r.id;

    try {
      const household = r.households;
      const event = household?.events;

      if (!household || !event) {
        throw new Error("Missing households/events join data");
      }

      const to = resolveSendTo(env, household.phone_e164);
      const message = buildMessage({
        household,
        event,
        reminderStep: r.reminder_step,
      });

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

        await supabaseFetch(env, `reminder_state?id=eq.${reminderId}`, {
          method: "PATCH",
          body: JSON.stringify({
            reminder_step: next,
            next_reminder_at: nextAt,
          }),
        });
      } else {
        await supabaseFetch(env, `reminder_state?id=eq.${reminderId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
            next_reminder_at: null,
          }),
        });
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
      } catch (_) {
        // ignore logging errors
      }

      results.push({
        reminder_id: reminderId,
        sent: false,
        error: String((err as Error)?.message || err),
      });
    }
  }

  return results;
}
