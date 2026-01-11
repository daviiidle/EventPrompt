import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

export async function GET(
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
    .select("id, owner_user_id, owner_email, tier")
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

  const { data: households, error: householdsError } = await adminClient
    .from("households")
    .select("id, household_name, email, phone_e164, rsvp_attending, sms_opt_out")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (householdsError) {
    return NextResponse.json({ ok: false, error: "Failed to load households." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier: event.tier, households });
}
