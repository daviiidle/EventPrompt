import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

function generateToken() {
  return randomBytes(24).toString("base64url");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const eventId = resolvedParams.eventId?.trim();

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Missing event ID." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id) {
    if (!event.owner_user_id && event.owner_email?.toLowerCase() === normalizedEmail) {
      await adminClient
        .from("events")
        .update({ owner_user_id: user.id })
        .eq("id", event.id)
        .is("owner_user_id", null);
    } else {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: existing } = await adminClient
    .from("event_email_collection_tokens")
    .select("token")
    .eq("event_id", eventId)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.token) {
    return NextResponse.json({ ok: true, token: existing.token });
  }

  const token = generateToken();
  const { error: insertError } = await adminClient
    .from("event_email_collection_tokens")
    .insert({ event_id: eventId, token, status: "active" })
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to create token." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, token }, { status: 200 });
}
