export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  TWILIO_TEST_TO?: string;
  APP_ENV?: string;
  DEBUG_TOKEN?: string;
  DEV_FORCE_TO?: string;
  REQUIRE_UNRESPONDED_ONLY?: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function debugAuthFail(url: URL, env: Env): Response | null {
  if (!env.DEBUG_TOKEN) return null;

  const token = url.searchParams.get("token");
  if (token !== env.DEBUG_TOKEN) {
    return json({ error: "Unauthorized (missing/invalid token)" }, 401);
  }

  return null;
}

export function resolveSendTo(env: Env, householdPhone: string): string {
  if (String(env.APP_ENV || "").toLowerCase() === "dev" && env.DEV_FORCE_TO) {
    return env.DEV_FORCE_TO;
  }

  return householdPhone;
}
