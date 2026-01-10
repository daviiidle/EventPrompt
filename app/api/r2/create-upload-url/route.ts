import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getR2Client } from "@/lib/r2";

type EventRow = {
  id: string;
  paid: boolean | null;
  owner_user_id: string | null;
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function sanitizeFilename(filename: string) {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 0 ? base : "upload.bin";
}

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid Authorization header." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env vars are not configured." },
      { status: 500 }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(
    accessToken
  );

  if (authError || !authData.user) {
    return NextResponse.json(
      { ok: false, error: authError?.message ?? "Invalid or expired access token." },
      { status: 401 }
    );
  }

  const body = (await request.json()) as {
    eventId?: string;
    filename?: string;
    contentType?: string;
  };

  const eventId = body.eventId?.trim();
  const filename = body.filename?.trim();
  const contentType = body.contentType?.trim();

  if (!eventId || !isUuidLike(eventId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing eventId." },
      { status: 400 }
    );
  }

  if (!filename || !contentType) {
    return NextResponse.json(
      { ok: false, error: "Missing filename or contentType." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: event, error: fetchError } = await adminClient
    .from("events")
    .select("id, paid, owner_user_id")
    .eq("id", eventId)
    .maybeSingle<EventRow>();

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: "Failed to load event." },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json(
      { ok: false, error: "Event not found." },
      { status: 404 }
    );
  }

  if (event.paid !== true) {
    return NextResponse.json(
      { ok: false, error: "Event not paid" },
      { status: 403 }
    );
  }

  if (event.owner_user_id !== authData.user.id) {
    return NextResponse.json(
      { ok: false, error: "Event ownership mismatch." },
      { status: 403 }
    );
  }

  const timestamp = formatTimestamp(new Date());
  const randomSuffix = randomBytes(3).toString("hex");
  const safeName = sanitizeFilename(filename);
  const objectKey = `events/${eventId}/${timestamp}-${randomSuffix}-${safeName}`;

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json(
      { ok: false, error: "Missing R2 bucket configuration." },
      { status: 500 }
    );
  }

  const r2 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const expiresIn = 60;
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });

  return NextResponse.json({
    ok: true,
    uploadUrl,
    objectKey,
    expiresIn,
  });
}
