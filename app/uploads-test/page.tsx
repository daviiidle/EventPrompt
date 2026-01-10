"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

type UploadState = {
  uploadUrl?: string;
  objectKey?: string;
  recordResponse?: unknown;
  photosResponse?: unknown;
};

const UploadsTestPage = () => {
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [output, setOutput] = useState<UploadState>({});

  const runUpload = async () => {
    const cleanEventId = eventId.trim();
    setStatus("");
    setOutput({});

    if (!file) {
      setStatus("Choose a file first.");
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setStatus(`Session error: ${error.message}`);
      return;
    }

    const session = data.session;
    if (!session) {
      setStatus("Not logged in.");
      return;
    }

    try {
      const createRes = await fetch("/api/r2/create-upload-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: cleanEventId,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      const createJson = (await createRes.json()) as {
        ok?: boolean;
        uploadUrl?: string;
        objectKey?: string;
      };

      if (!createRes.ok || !createJson.uploadUrl || !createJson.objectKey) {
        setOutput({ recordResponse: createJson });
        setStatus(`Create URL failed (${createRes.status}).`);
        return;
      }

      setOutput({
        uploadUrl: createJson.uploadUrl,
        objectKey: createJson.objectKey,
      });

      const putRes = await fetch(createJson.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putRes.ok) {
        setStatus(`Upload failed (${putRes.status}).`);
        return;
      }

      const recordRes = await fetch("/api/r2/record-upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: cleanEventId,
          objectKey: createJson.objectKey,
          contentType: file.type || "application/octet-stream",
        }),
      });

      const recordJson = (await recordRes.json()) as unknown;
      const listRes = await fetch(
        `/api/events/${encodeURIComponent(cleanEventId)}/photos`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const listJson = (await listRes.json()) as unknown;

      setOutput({
        uploadUrl: createJson.uploadUrl,
        objectKey: createJson.objectKey,
        recordResponse: recordJson,
        photosResponse: listJson,
      });
      setStatus("Upload complete.");
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Request failed.";
      setStatus(`Request error: ${message}`);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Uploads Test</h1>
      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="eventId">Event ID</label>
        <input
          id="eventId"
          type="text"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          style={{ display: "block", marginTop: "0.5rem", width: "100%" }}
        />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="file">File</label>
        <input
          id="file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          style={{ display: "block", marginTop: "0.5rem" }}
        />
      </div>
      <button
        type="button"
        onClick={runUpload}
        style={{ marginTop: "1rem" }}
      >
        Upload
      </button>
      {status ? <p style={{ marginTop: "1rem" }}>{status}</p> : null}
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </main>
  );
};

export default UploadsTestPage;
