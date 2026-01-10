import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { computeGuestTokenExpiry } from "@/lib/eventUtils";

type EventRow = Record<string, unknown> & {
  id?: string;
  paid?: boolean | null;
  owner_user_id?: string | null;
};

export type GuestTokenRow = {
  id: string;
  token: string;
  status: string;
  event_id: string;
  created_at: string;
  rotated_at: string | null;
  expires_at: string | null;
  events?: EventRow | null;
};

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function getTokenInfoByToken(token: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("event_guest_tokens")
    .select("id, token, status, event_id, created_at, rotated_at, expires_at, events(*)")
    .eq("token", token)
    .maybeSingle<GuestTokenRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export function isTokenExpired(tokenRow: GuestTokenRow) {
  if (!tokenRow.expires_at) return false;
  const expires = new Date(tokenRow.expires_at);
  if (Number.isNaN(expires.getTime())) return false;
  return Date.now() > expires.getTime();
}

export async function ensureActiveGuestToken(eventId: string) {
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("event_guest_tokens")
    .select("id, token, status, event_id, created_at, rotated_at, expires_at")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GuestTokenRow>();

  if (existing) return existing;

  const { data: event } = await adminClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  const expiresAt = computeGuestTokenExpiry(event ?? null);

  const { data: inserted, error: insertError } = await adminClient
    .from("event_guest_tokens")
    .insert({
      event_id: eventId,
      token: generateToken(),
      status: "active",
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    })
    .select("id, token, status, event_id, created_at, rotated_at, expires_at")
    .single<GuestTokenRow>();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to create guest token.");
  }

  return inserted;
}

export async function rotateGuestToken(eventId: string) {
  const adminClient = createAdminClient();

  await adminClient
    .from("event_guest_tokens")
    .update({ status: "rotated", rotated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("status", "active");

  const { data: event } = await adminClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  const expiresAt = computeGuestTokenExpiry(event ?? null);

  const { data: inserted, error: insertError } = await adminClient
    .from("event_guest_tokens")
    .insert({
      event_id: eventId,
      token: generateToken(),
      status: "active",
      ...(expiresAt ? { expires_at: expiresAt } : {}),
    })
    .select("id, token, status, event_id, created_at, rotated_at, expires_at")
    .single<GuestTokenRow>();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to rotate guest token.");
  }

  return inserted;
}
