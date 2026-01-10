import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { rotateGuestToken } from "@/lib/guestTokens";

export async function POST(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { eventId?: string };
  const requestedEventId = body.eventId?.trim();

  const adminClient = createAdminClient();
  const { data: events, error: eventsError } = await adminClient
    .from("events")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (eventsError) {
    return NextResponse.json(
      { ok: false, error: "Failed to load events." },
      { status: 500 }
    );
  }

  if (!events || events.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No events found." },
      { status: 404 }
    );
  }

  let event = events[0];
  if (requestedEventId) {
    const match = events.find((item) => item.id === requestedEventId);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: "Event ownership mismatch." },
        { status: 403 }
      );
    }
    event = match;
  } else if (events.length > 1) {
    return NextResponse.json(
      { ok: false, error: "Multiple events found. Choose one." },
      { status: 400 }
    );
  }

  try {
    const tokenRow = await rotateGuestToken(event.id as string);
    return NextResponse.json({
      ok: true,
      token: tokenRow.token,
      eventId: event.id,
      expiresAt: tokenRow.expires_at,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to rotate token." },
      { status: 500 }
    );
  }
}
