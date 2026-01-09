import { processDueReminders } from "./reminders";
import { supabaseFetch } from "./supabase";
import { sendSms } from "./twilio";
import { debugAuthFail, json, type Env } from "./utils";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return await healthCheck(env);
    }

    if (url.pathname === "/debug/send-test") {
      const authFail = debugAuthFail(url, env);
      if (authFail) return authFail;

      return await sendTestSms(env);
    }

    if (url.pathname === "/debug/run-once") {
      const authFail = debugAuthFail(url, env);
      if (authFail) return authFail;

      const result = await processDueReminders(env, 3);
      return json({ ok: true, processed: result });
    }

    return new Response("eventprompt reminders worker ok", { status: 200 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("CRON FIRED", new Date().toISOString());
    ctx.waitUntil(processDueReminders(env, 5));
  },
};

async function healthCheck(env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing Supabase env vars" }, 500);
  }

  const query =
    `reminder_state?status=eq.active` +
    `&next_reminder_at=lte.${new Date().toISOString()}` +
    `&select=id,household_id,reminder_step,next_reminder_at`;

  const res = await supabaseFetch(env, query);

  if (!res.ok) {
    return json(
      {
        error: "Supabase query failed",
        status: res.status,
        body: await res.text(),
      },
      500
    );
  }

  const rows = await res.json();

  return json({
    ok: true,
    count: rows.length,
    data: rows,
  });
}

async function sendTestSms(env: Env): Promise<Response> {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
    TWILIO_TEST_TO,
  } = env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_FROM_NUMBER ||
    !TWILIO_TEST_TO
  ) {
    return json({ error: "Missing Twilio env vars" }, 500);
  }

  await sendSms(env, TWILIO_TEST_TO, "EventPrompt test SMS 🚀");

  return json({ ok: true, message: "Test SMS sent" });
}
