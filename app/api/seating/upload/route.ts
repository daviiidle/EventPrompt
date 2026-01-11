import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getR2Client } from "@/lib/r2";
import { buildSeatingPlanObjectKey } from "@/lib/r2Uploads";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const file = formData.get("file");

  if (!eventId || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing event or file." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email")
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

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json({ ok: false, error: "Missing R2 bucket." }, { status: 500 });
  }

  const objectKey = buildSeatingPlanObjectKey(eventId, file.name || "plan.png");
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";

  const r2 = getR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  await adminClient
    .from("seating_plans")
    .update({ is_active: false })
    .eq("event_id", eventId);

  const { data: plan, error: insertError } = await adminClient
    .from("seating_plans")
    .insert({
      event_id: eventId,
      name: file.name || "Seating plan",
      object_key: objectKey,
      content_type: contentType,
      is_active: true,
    })
    .select("id, object_key, content_type, is_active")
    .single();

  if (insertError || !plan) {
    return NextResponse.json(
      { ok: false, error: "Failed to save seating plan." },
      { status: 500 }
    );
  }

  const viewUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: 3600 }
  );

  return NextResponse.json({ ok: true, plan: { ...plan, viewUrl } }, { status: 200 });
}
