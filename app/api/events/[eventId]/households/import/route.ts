import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { normalizeEmail, normalizePhone, validateImportRows } from "@/lib/guestImport";

type ImportBody = {
  sourceType?: "paste" | "csv";
  payload?: string;
  mode?: "overwrite";
};

function computeNextReminderAt(eventDate: string | null, daysBefore: number) {
  if (!eventDate) return null;
  const base = new Date(`${eventDate}T00:00:00.000Z`);
  const ms = base.getTime() - daysBefore * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

function parseCsvRow(row: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === "\"") {
      if (inQuotes && row[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parsePaste(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = parseCsvRow(line);
      const name = parts[0] ?? "";
      const contact = parts[1] ?? "";
      const email = contact.includes("@") ? contact : "";
      const phone = contact && !contact.includes("@") ? contact : parts[2] ?? "";
      return { name, email, phone };
    });
}

function parseCsv(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((header) => header.toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name" || h === "household_name");
  const emailIdx = headers.findIndex((h) => h === "email");
  const phoneIdx = headers.findIndex((h) => h === "phone");

  return lines.slice(1).map((line) => {
    const parts = parseCsvRow(line);
    return {
      name: parts[nameIdx] ?? "",
      email: emailIdx >= 0 ? parts[emailIdx] : "",
      phone: phoneIdx >= 0 ? parts[phoneIdx] : "",
    };
  });
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

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const sourceType = body.sourceType ?? "paste";
  const payload = body.payload ?? "";
  const mode = body.mode ?? "overwrite";

  if (mode !== "overwrite") {
    return NextResponse.json({ ok: false, error: "Unsupported import mode." }, { status: 400 });
  }

  if (!payload.trim()) {
    return NextResponse.json({ ok: false, error: "No guest data provided." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tier, owner_user_id, owner_email, event_date")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id && event.owner_email?.toLowerCase() !== normalizedEmail) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rows = sourceType === "csv" ? parseCsv(payload) : parsePaste(payload);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "No rows detected." }, { status: 400 });
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
    email: normalizeEmail(row.email),
    phone_e164: normalizePhone(row.phone),
  }));

  const { data: inserted, error: insertError } = await adminClient
    .from("households")
    .insert(insertRows)
    .select("id, sms_opt_out");

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
