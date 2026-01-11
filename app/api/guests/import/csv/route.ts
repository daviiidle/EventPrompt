import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { validateImportRows, type GuestImportRow } from "@/lib/guestImport";

function computeNextReminderAt(eventDate: string | null, daysBefore: number) {
  if (!eventDate) return null;
  const base = new Date(`${eventDate}T00:00:00.000Z`);
  const ms = base.getTime() - daysBefore * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string; rows?: GuestImportRow[] };
  try {
    body = (await request.json()) as { eventId?: string; rows?: GuestImportRow[] };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = body.eventId?.trim() ?? "";
  const rows = body.rows ?? [];

  if (!eventId || rows.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing event or rows." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email, tier, event_date")
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

  const { normalized, errors } = validateImportRows(rows);
  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Validation failed.", errors },
      { status: 400 }
    );
  }

  const { data: existingHouseholds } = await adminClient
    .from("households")
    .select("id")
    .eq("event_id", eventId);

  if (existingHouseholds && existingHouseholds.length > 0) {
    const ids = existingHouseholds.map((row) => row.id);
    await adminClient.from("reminder_state").delete().in("household_id", ids);
    await adminClient.from("households").delete().eq("event_id", eventId);
  }

  const insertRows = normalized.map((row) => ({
    event_id: eventId,
    household_name: row.name,
    email: row.email,
    phone_e164: row.phone,
  }));

  const { data: inserted, error: insertError } = await adminClient
    .from("households")
    .insert(insertRows)
    .select("id");

  if (insertError || !inserted) {
    return NextResponse.json(
      { ok: false, error: "Failed to import guests." },
      { status: 500 }
    );
  }

  if (inserted.length > 0) {
    const nextAt = computeNextReminderAt(event.event_date ?? null, 21);
    const reminders = inserted.map((row) => ({
      household_id: row.id,
      reminder_step: 21,
      status: "active",
      next_reminder_at: nextAt,
    }));
    await adminClient.from("reminder_state").insert(reminders);
  }

  return NextResponse.json({ ok: true, imported: insertRows.length }, { status: 200 });
}
