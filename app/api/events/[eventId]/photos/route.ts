import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2";

export const dynamic = "force-dynamic";

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

  const { data: event, error: fetchError } = await adminClient
    .from("events")
    .select("id, owner_user_id")
    .eq("id", eventId)
    .maybeSingle();

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

  if (event.owner_user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Event ownership mismatch." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const origin = (searchParams.get("origin") ?? "all").toLowerCase();
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const cursor = searchParams.get("cursor");

  let query = adminClient
    .from("event_photos")
    .select("id, event_id, object_key, content_type, created_at, upload_origin")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (origin === "guest" || origin === "owner") {
    query = query.eq("upload_origin", origin);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: photos, error: photosError } = await query;

  if (photosError) {
    return NextResponse.json(
      { ok: false, error: "Failed to load photos." },
      { status: 500 }
    );
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json({ ok: false, error: "Missing R2 bucket." }, { status: 500 });
  }

  const r2 = getR2Client();
  const items = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const viewUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: bucket, Key: photo.object_key }),
        { expiresIn: 3600 }
      );
      return { ...photo, url: viewUrl, downloadUrl: viewUrl };
    })
  );

  const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null;

  return NextResponse.json({ ok: true, photos: items, nextCursor });
}
