import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getR2Client } from "@/lib/r2";
import PhotosGallery from "./PhotosGallery";

type PhotosPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function PhotosPage({ params }: PhotosPageProps) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId?.trim();
  if (!eventId) {
    return (
      <main className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        Missing event.
      </main>
    );
  }

  const adminClient = createAdminClient();
  const { data: photos } = await adminClient
    .from("event_photos")
    .select("id, event_id, object_key, content_type, created_at, upload_origin")
    .eq("event_id", eventId)
    .eq("upload_origin", "guest")
    .order("created_at", { ascending: false })
    .limit(50);

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return (
      <main className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        Missing R2 configuration.
      </main>
    );
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

  return (
    <PhotosGallery
      eventId={eventId}
      initialPhotos={items}
      initialCursor={nextCursor}
      initialOrigin="guest"
    />
  );
}
