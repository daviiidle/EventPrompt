import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    eventId?: string;
    seatingTableId?: string;
    householdId?: string;
    action?: "assign" | "unassign";
  };
  try {
    body = (await request.json()) as {
      eventId?: string;
      seatingTableId?: string;
      householdId?: string;
      action?: "assign" | "unassign";
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = body.eventId?.trim() ?? "";
  const seatingTableId = body.seatingTableId?.trim() ?? "";
  const householdId = body.householdId?.trim() ?? "";
  const action = body.action ?? "assign";

  if (!eventId || !seatingTableId || !householdId) {
    return NextResponse.json({ ok: false, error: "Missing assignment data." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
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

  if (action === "unassign") {
    const { error: deleteError } = await adminClient
      .from("seating_assignments")
      .delete()
      .eq("seating_table_id", seatingTableId)
      .eq("household_id", householdId);

    if (deleteError) {
      return NextResponse.json({ ok: false, error: "Failed to unassign guest." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { error: insertError } = await adminClient.from("seating_assignments").upsert({
    seating_table_id: seatingTableId,
    household_id: householdId,
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: "Failed to assign guest." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
