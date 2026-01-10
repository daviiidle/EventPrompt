import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return { supabaseUrl, supabaseAnonKey };
}

export function getAccessTokenFromRequest(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header) {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1];
  }
  return request.cookies.get("sb-access-token")?.value ?? null;
}

export async function getUserFromAccessToken(accessToken: string | null) {
  if (!accessToken) return null;
  const env = getSupabaseEnv();
  if (!env) return null;
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export async function getServerUser() {
  // Next.js 15+ returns async cookie stores.
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value ?? null;
  return getUserFromAccessToken(token);
}
