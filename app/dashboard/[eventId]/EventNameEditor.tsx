"use client";

import { useState } from "react";

type EventNameEditorProps = {
  eventId: string;
  initialName: string;
};

export default function EventNameEditor({ eventId, initialName }: EventNameEditorProps) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setStatus(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Enter an event name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: trimmed }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setStatus(payload.error ?? "Failed to save.");
        return;
      }
      setStatus("Saved.");
    } catch {
      setStatus("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">Event name</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Set the name guests will see on your share links.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Alex & Jamie Wedding"
          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-neutral-600">{status}</p> : null}
    </section>
  );
}
