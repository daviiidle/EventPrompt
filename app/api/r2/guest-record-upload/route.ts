import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getTokenInfoByToken, isTokenExpired } from "@/lib/guestTokens";
import { validateGuestUpload } from "@/lib/validateUploads";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string;
    objectKey?: string;
    originalFilename?: string;
    contentType?: string;
    size?: number;
  };

  const token = body.token?.trim() ?? "";
  const objectKey = body.objectKey?.trim() ?? "";
  const contentType = body.contentType?.trim() ?? "";
  const size = typeof body.size === "number" ? body.size : null;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token." },
      { status: 400 }
    );
  }

  if (!objectKey || !contentType) {
    return NextResponse.json(
      { ok: false, error: "Missing object key or content type." },
      { status: 400 }
    );
  }

  const rate = checkRateLimit({
    key: `guest-record:${token.slice(0, 16)}`,
    limit: 30,
    windowMs: 5 * 60 * 1000,
  });

  if (!rate.ok) {
    const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: "Too many requests. Slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const validation = validateGuestUpload({ contentType, size });
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }

  let tokenInfo;
  try {
    tokenInfo = await getTokenInfoByToken(token);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to validate token." },
      { status: 500 }
    );
  }

  if (!tokenInfo) {
    return NextResponse.json(
      { ok: false, error: "Upload link invalid." },
      { status: 404 }
    );
  }

  if (tokenInfo.status !== "active") {
    return NextResponse.json(
      { ok: false, error: "Upload link inactive." },
      { status: 403 }
    );
  }

  if (isTokenExpired(tokenInfo)) {
    return NextResponse.json(
      { ok: false, error: "Upload link expired." },
      { status: 410 }
    );
  }

  const event = tokenInfo.events ?? null;
  if (!event || event.paid !== true) {
    return NextResponse.json(
      { ok: false, error: "Event not paid." },
      { status: 403 }
    );
  }

  const eventId = tokenInfo.event_id;
  if (!objectKey.startsWith(`events/${eventId}/guest/`)) {
    return NextResponse.json(
      { ok: false, error: "Object key does not match event." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { error: insertError } = await adminClient.from("event_photos").insert({
    event_id: eventId,
    object_key: objectKey,
    content_type: contentType,
    uploaded_by: "guest",
    guest_token_id: tokenInfo.id,
  });

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to record upload." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
