import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { normalizePhone } from "@/lib/guestImport";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const householdId = resolvedParams.householdId?.trim();

  if (!householdId) {
    return NextResponse.json({ ok: false, error: "Missing household ID." }, { status: 400 });
  }

  let body: { email?: string | null; phone?: string | null; name?: string | null };
  try {
    body = (await request.json()) as {
      email?: string | null;
      phone?: string | null;
      name?: string | null;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" && body.email.trim().length > 0
      ? body.email.trim().toLowerCase()
      : null;
  const phone =
    typeof body.phone === "string" && body.phone.trim().length > 0
      ? normalizePhone(body.phone)
      : null;
  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : null;

  const adminClient = createAdminClient();
  const { data: household, error: householdError } = await adminClient
    .from("households")
    .select("id, event_id, email, phone_e164")
    .eq("id", householdId)
    .maybeSingle();

  if (householdError || !household) {
    return NextResponse.json({ ok: false, error: "Household not found." }, { status: 404 });
  }

  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email")
    .eq("id", household.event_id)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id && event.owner_email?.toLowerCase() !== normalizedEmail) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!email && !phone && !name) {
    return NextResponse.json(
      { ok: false, error: "Provide at least one field to update." },
      { status: 400 }
    );
  }

  const updatePayload: { email?: string | null; phone_e164?: string | null; household_name?: string | null } =
    {};
  if (body.email !== undefined) updatePayload.email = email;
  if (body.phone !== undefined) updatePayload.phone_e164 = phone;
  if (body.name !== undefined) updatePayload.household_name = name;

  const updatedEmail = body.email !== undefined ? email : household.email;
  const updatedPhone = body.phone !== undefined ? phone : household.phone_e164;

  if (!updatedEmail && !updatedPhone) {
    return NextResponse.json(
      { ok: false, error: "Email or phone is required." },
      { status: 400 }
    );
  }

  const { error: updateError } = await adminClient
    .from("households")
    .update(updatePayload)
    .eq("id", householdId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "Failed to update email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
