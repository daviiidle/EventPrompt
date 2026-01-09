import type { Env } from "./utils";

export function supabaseFetch(
  env: Env,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY || "",
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
}
