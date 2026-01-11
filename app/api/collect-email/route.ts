import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  let body: { token?: string; email?: string; phone?: string; householdId?: string };
  try {
    body = (await request.json()) as {
      token?: string;
      email?: string;
      phone?: string;
      householdId?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? "";
  const householdId = body.householdId?.trim() ?? "";

  if (!token || !email || (!phone && !householdId)) {
    return NextResponse.json(
      { ok: false, error: "Token, email, and phone (or household ID) are required." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: tokenRow, error: tokenError } = await adminClient
    .from("event_email_collection_tokens")
    .select("id, event_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return NextResponse.json({ ok: false, error: "Invalid link." }, { status: 404 });
  }

  if (tokenRow.status !== "active") {
    return NextResponse.json({ ok: false, error: "Link inactive." }, { status: 403 });
  }

  if (tokenRow.expires_at) {
    const expires = new Date(tokenRow.expires_at);
    if (!Number.isNaN(expires.getTime()) && Date.now() > expires.getTime()) {
      return NextResponse.json({ ok: false, error: "Link expired." }, { status: 410 });
    }
  }

  const eventId = tokenRow.event_id;

  if (householdId) {
    const { error: updateError } = await adminClient
      .from("households")
      .update({ email, phone_e164: phone || null })
      .eq("id", householdId)
      .eq("event_id", eventId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Failed to update email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: true }, { status: 200 });
  }

  const { data: existing } = await adminClient
    .from("households")
    .select("id, email")
    .eq("event_id", eventId)
    .eq("phone_e164", phone)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error: updateError } = await adminClient
      .from("households")
      .update({ email })
      .eq("id", existing[0].id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Failed to update email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: true }, { status: 200 });
  }

  const { error: insertError } = await adminClient.from("households").insert({
    event_id: eventId,
    household_name: phone,
    email,
    phone_e164: phone,
  });

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to save email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, created: true }, { status: 200 });
}
