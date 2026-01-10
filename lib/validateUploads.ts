const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type UploadCategory = "image" | "video";

export function getUploadCategory(contentType: string) {
  if (IMAGE_TYPES.has(contentType)) return "image";
  if (VIDEO_TYPES.has(contentType)) return "video";
  return null;
}

export function validateGuestUpload({
  contentType,
  size,
}: {
  contentType?: string | null;
  size?: number | null;
}) {
  if (!contentType) {
    return { ok: false, error: "Missing content type." } as const;
  }

  const category = getUploadCategory(contentType);
  if (!category) {
    return { ok: false, error: "Unsupported file type." } as const;
  }

  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
    return { ok: false, error: "Invalid file size." } as const;
  }

  const limit = category === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (size > limit) {
    const label = category === "image" ? "image" : "video";
    return { ok: false, error: `File too large for ${label} uploads.` } as const;
  }

  return { ok: true, category } as const;
}
