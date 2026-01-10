import { NextRequest, NextResponse } from "next/server";
import { buildGuestObjectKey, createSignedUploadUrl } from "@/lib/r2Uploads";
import { checkRateLimit } from "@/lib/rateLimit";
import { getTokenInfoByToken, isTokenExpired } from "@/lib/guestTokens";
import { validateGuestUpload } from "@/lib/validateUploads";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string;
    filename?: string;
    contentType?: string;
    size?: number;
  };

  const token = body.token?.trim() ?? "";
  const filename = body.filename?.trim() ?? "";
  const contentType = body.contentType?.trim() ?? "";
  const size = typeof body.size === "number" ? body.size : null;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token." },
      { status: 400 }
    );
  }

  if (!filename || !contentType) {
    return NextResponse.json(
      { ok: false, error: "Missing filename or content type." },
      { status: 400 }
    );
  }

  const rate = checkRateLimit({
    key: `guest-create:${token.slice(0, 16)}`,
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
  const tokenPrefix = token.slice(0, 8);
  const objectKey = buildGuestObjectKey(eventId, tokenPrefix, filename);

  let uploadUrl: string;
  let expiresIn: number;
  try {
    const signed = await createSignedUploadUrl({
      objectKey,
      contentType,
      expiresIn: 60,
    });
    uploadUrl = signed.uploadUrl;
    expiresIn = signed.expiresIn;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign upload URL.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    uploadUrl,
    objectKey,
    expiresIn,
  });
}
