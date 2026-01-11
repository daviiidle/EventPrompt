import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import { getR2Client } from "@/lib/r2";

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

function formatDatePath(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export function sanitizeFilename(filename: string) {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 0 ? base : "upload.bin";
}

export function buildOwnerObjectKey(eventId: string, filename: string) {
  const timestamp = formatTimestamp(new Date());
  const randomSuffix = randomBytes(3).toString("hex");
  const safeName = sanitizeFilename(filename);
  return `events/${eventId}/${timestamp}-${randomSuffix}-${safeName}`;
}

export function buildGuestObjectKey(eventId: string, tokenPrefix: string, filename: string) {
  const datePath = formatDatePath(new Date());
  const randomSuffix = randomBytes(6).toString("hex");
  const safeName = sanitizeFilename(filename);
  return `events/${eventId}/guest/${datePath}/${tokenPrefix}/${randomSuffix}/${safeName}`;
}

export function buildSeatingPlanObjectKey(eventId: string, filename: string) {
  const timestamp = formatTimestamp(new Date());
  const randomSuffix = randomBytes(3).toString("hex");
  const safeName = sanitizeFilename(filename);
  return `events/${eventId}/seating-plans/${timestamp}-${randomSuffix}-${safeName}`;
}

export async function createSignedUploadUrl({
  objectKey,
  contentType,
  expiresIn = 60,
}: {
  objectKey: string;
  contentType: string;
  expiresIn?: number;
}) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("Missing R2 bucket configuration.");
  }

  const r2 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });

  return {
    uploadUrl,
    objectKey,
    bucket,
    expiresIn,
  };
}
