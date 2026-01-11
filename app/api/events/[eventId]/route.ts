import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

export async function PATCH(
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

  let body: { event_name?: string | null };
  try {
    body = (await request.json()) as { event_name?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const eventName =
    typeof body.event_name === "string" && body.event_name.trim().length > 0
      ? body.event_name.trim()
      : null;

  if (body.event_name !== undefined && !eventName) {
    return NextResponse.json(
      { ok: false, error: "Event name cannot be empty." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email, paid")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id && event.owner_email?.toLowerCase() !== normalizedEmail) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!event.paid) {
    return NextResponse.json(
      { ok: false, error: "Payment required." },
      { status: 403 }
    );
  }

  if (body.event_name !== undefined) {
    const { error: updateError } = await adminClient
      .from("events")
      .update({ event_name: eventName })
      .eq("id", eventId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: "Failed to update event name." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
