import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";
import { createSignedUploadUrl, sanitizeFilename } from "@/lib/r2Uploads";
import { randomUUID } from "node:crypto";

type SignRequest = {
  action: "sign";
  files: Array<{ filename: string; contentType: string }>;
};

type FinalizeRequest = {
  action: "finalize";
  uploads: Array<{ objectKey: string; contentType: string }>;
};

function buildOwnerUploadKey(eventId: string, filename: string) {
  const safeName = sanitizeFilename(filename);
  return `owner-uploads/${eventId}/${randomUUID()}-${safeName}`;
}

export async function POST(
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

  let body: SignRequest | FinalizeRequest;
  try {
    body = (await request.json()) as SignRequest | FinalizeRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, paid")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  if (event.owner_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (event.paid !== true) {
    return NextResponse.json({ ok: false, error: "Payment required." }, { status: 403 });
  }

  if (body.action === "sign") {
    const files = Array.isArray(body.files) ? body.files : [];
    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing files." }, { status: 400 });
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const objectKey = buildOwnerUploadKey(eventId, file.filename);
        const signed = await createSignedUploadUrl({
          objectKey,
          contentType: file.contentType,
          expiresIn: 120,
        });
        return {
          filename: file.filename,
          contentType: file.contentType,
          objectKey,
          uploadUrl: signed.uploadUrl,
          expiresIn: signed.expiresIn,
        };
      })
    );

    return NextResponse.json({ ok: true, uploads });
  }

  if (body.action === "finalize") {
    const uploads = Array.isArray(body.uploads) ? body.uploads : [];
    if (uploads.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing uploads." }, { status: 400 });
    }

    const rows = uploads.map((upload) => ({
      event_id: eventId,
      object_key: upload.objectKey,
      content_type: upload.contentType,
      upload_origin: "owner",
      uploaded_by: user.id,
      guest_token_id: null,
    }));

    const { error: insertError } = await adminClient.from("event_photos").insert(rows);

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: "Failed to record uploads." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
}
