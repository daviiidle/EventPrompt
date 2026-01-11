"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type PhotoRow = {
  id: string;
  object_key: string;
  content_type: string | null;
  created_at: string;
  upload_origin: string | null;
  url: string;
  downloadUrl: string;
};

type PhotosGalleryProps = {
  eventId: string;
  initialPhotos: PhotoRow[];
  initialCursor: string | null;
  initialOrigin?: OriginFilter;
};

type OriginFilter = "all" | "guest" | "owner";

const FILTERS: Array<{ value: OriginFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "guest", label: "Guest uploads" },
  { value: "owner", label: "Owner uploads" },
];

function isImage(contentType: string | null) {
  return Boolean(contentType && contentType.startsWith("image/"));
}

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function PhotosGallery({
  eventId,
  initialPhotos,
  initialCursor,
  initialOrigin = "guest",
}: PhotosGalleryProps) {
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [origin, setOrigin] = useState<OriginFilter>(initialOrigin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PhotoRow | null>(null);
  const [uploads, setUploads] = useState<
    Array<{
      name: string;
      progress: number;
      status: "idle" | "uploading" | "done" | "error";
    }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  const loadPage = async (nextOrigin: OriginFilter, nextCursor?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        origin: nextOrigin,
        limit: "50",
      });
      if (nextCursor) params.set("cursor", nextCursor);

      const res = await fetch(`/api/events/${eventId}/photos?${params.toString()}`);
      const payload = (await res.json()) as {
        ok?: boolean;
        photos?: PhotoRow[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!res.ok || !payload.ok || !payload.photos) {
        setError(payload.error ?? "Failed to load photos.");
        return;
      }

      if (nextCursor) {
        setPhotos((prev) => [...prev, ...payload.photos!]);
      } else {
        setPhotos(payload.photos);
      }
      setCursor(payload.nextCursor ?? null);
    } catch {
      setError("Failed to load photos.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCountLabel = useMemo(() => {
    if (origin === "guest") return "Guest uploads";
    if (origin === "owner") return "Owner uploads";
    return "All uploads";
  }, [origin]);

  const startUploads = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setError(null);
    setUploads(
      list.map((file) => ({
        name: file.name,
        progress: 0,
        status: "idle",
      }))
    );

    try {
      const res = await fetch(`/api/events/${eventId}/photos/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          files: list.map((file) => ({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          })),
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        uploads?: Array<{
          uploadUrl: string;
          objectKey: string;
          contentType: string;
          filename: string;
        }>;
        error?: string;
      };

      if (!res.ok || !payload.ok || !payload.uploads) {
        setError(payload.error ?? "Failed to start uploads.");
        return;
      }

      for (const upload of payload.uploads) {
        const file = list.find((item) => item.name === upload.filename);
        if (!file) continue;

        setUploads((prev) =>
          prev.map((item) =>
            item.name === file.name ? { ...item, status: "uploading" } : item
          )
        );

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", upload.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", upload.contentType);
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploads((prev) =>
              prev.map((item) =>
                item.name === file.name ? { ...item, progress } : item
              )
            );
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Upload failed."));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed."));
          xhr.send(file);
        });

        const finalizeRes = await fetch(`/api/events/${eventId}/photos/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "finalize",
            uploads: [
              { objectKey: upload.objectKey, contentType: upload.contentType },
            ],
          }),
        });

        const finalizePayload = (await finalizeRes.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!finalizeRes.ok || !finalizePayload.ok) {
          setUploads((prev) =>
            prev.map((item) =>
              item.name === file.name ? { ...item, status: "error" } : item
            )
          );
          setError(finalizePayload.error ?? "Failed to record upload.");
          continue;
        }

        setUploads((prev) =>
          prev.map((item) =>
            item.name === file.name
              ? { ...item, status: "done", progress: 100 }
              : item
          )
        );
      }

      await loadPage(origin, null);
    } catch {
      setError("Upload failed.");
    }
  };

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">Photos</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Browse every upload for this event.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-5 text-sm transition ${
              isDragging
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files?.length) {
                startUploads(event.dataTransfer.files);
              }
            }}
          >
            <p className="font-semibold">Drag & drop uploads</p>
            <p className="text-xs text-neutral-500">
              Images and videos up to your plan limit.
            </p>
            <label className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
              Upload files
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) {
                    startUploads(event.target.files);
                  }
                }}
              />
            </label>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-semibold text-neutral-700 dark:text-neutral-200">
              Upload status
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {uploads.length === 0 ? (
                <p className="text-neutral-500">No uploads yet.</p>
              ) : (
                uploads.map((item) => (
                  <div key={item.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                        {item.status}
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className={`h-full ${
                          item.status === "error"
                            ? "bg-rose-500"
                            : item.status === "done"
                              ? "bg-emerald-500"
                              : "bg-neutral-700"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setOrigin(item.value);
                setCursor(null);
                loadPage(item.value, null);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                origin === item.value
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-900 text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-xs uppercase tracking-wide text-neutral-500">
            {filteredCountLabel}: {photos.length}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(photo)}
              className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 text-left shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
            >
              {isImage(photo.content_type) ? (
                <Image
                  src={photo.url}
                  alt="Event upload"
                  width={640}
                  height={480}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-500">
                  <div className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                    File
                  </div>
                  <span className="text-xs">{photo.content_type ?? "Unknown type"}</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="pointer-events-none absolute bottom-2 left-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
                {formatTimestamp(photo.created_at)}
              </div>
            </button>
          ))}
        </div>

        {photos.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">No uploads yet.</p>
        ) : null}

        <div className="mt-6 flex justify-center">
          {cursor ? (
            <button
              type="button"
              onClick={() => loadPage(origin, cursor)}
              disabled={loading}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
            >
              Close
            </button>
            <div className="flex flex-col gap-4">
              {isImage(selected.content_type) ? (
                <Image
                  src={selected.url}
                  alt="Event upload"
                  width={1400}
                  height={1000}
                  className="max-h-[65vh] w-full rounded-2xl object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed text-sm text-neutral-500">
                  Preview unavailable for this file type.
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                <span>{formatTimestamp(selected.created_at)}</span>
                <a
                  href={selected.downloadUrl}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-200"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
