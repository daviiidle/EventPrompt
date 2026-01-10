"use client";

import { useState, type ChangeEvent } from "react";

type UploadStatus = "ready" | "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  name: string;
  status: UploadStatus;
  message?: string;
};

type GuestUploadFormProps = {
  token: string;
};

export default function GuestUploadForm({ token }: GuestUploadFormProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateItem = (id: string, next: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...next } : item))
    );
  };

  const uploadFile = async (file: File, id: string) => {
    updateItem(id, { status: "uploading", message: undefined });

    const createRes = await fetch("/api/r2/guest-create-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    const createPayload = (await createRes.json().catch(() => null)) as
      | { uploadUrl?: string; objectKey?: string; error?: string }
      | null;

    if (!createRes.ok || !createPayload?.uploadUrl || !createPayload?.objectKey) {
      updateItem(id, {
        status: "error",
        message: createPayload?.error ?? "Failed to start upload.",
      });
      return;
    }

    const putRes = await fetch(createPayload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!putRes.ok) {
      updateItem(id, { status: "error", message: "Upload failed." });
      return;
    }

    const recordRes = await fetch("/api/r2/guest-record-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        objectKey: createPayload.objectKey,
        originalFilename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    const recordPayload = (await recordRes.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!recordRes.ok) {
      updateItem(id, {
        status: "error",
        message: recordPayload?.error ?? "Failed to finish upload.",
      });
      return;
    }

    updateItem(id, { status: "done", message: "Uploaded." });
  };

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextItems: UploadItem[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      status: "ready",
    }));

    setItems((prev) => [...nextItems, ...prev]);
    setIsUploading(true);

    await Promise.all(
      nextItems.map((item, index) => uploadFile(files[index], item.id))
    );

    setIsUploading(false);
    event.target.value = "";
  };

  return (
    <div className="mt-4">
      <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center">
        <span className="text-sm font-medium text-neutral-900">Tap to upload</span>
        <span className="mt-1 text-xs text-neutral-500">JPG, PNG, HEIC, MP4</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
          onChange={handleSelect}
          className="mt-3 w-full text-sm"
        />
      </label>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <span className="truncate text-neutral-700">{item.name}</span>
              <span
                className={`ml-3 text-xs ${
                  item.status === "done"
                    ? "text-emerald-600"
                    : item.status === "error"
                    ? "text-red-500"
                    : "text-neutral-500"
                }`}
              >
                {item.status === "ready" && "Queued"}
                {item.status === "uploading" && "Uploading"}
                {item.status === "done" && "Done"}
                {item.status === "error" && (item.message ?? "Error")}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {isUploading ? (
        <p className="mt-3 text-xs text-neutral-500">Uploads in progress...</p>
      ) : null}
    </div>
  );
}
