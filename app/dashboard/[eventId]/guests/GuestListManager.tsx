"use client";

import { useMemo, useState } from "react";
import { validateImportRows, type GuestImportRow } from "@/lib/guestImport";

type HouseholdRow = {
  id: string;
  household_name: string | null;
  email: string | null;
  phone_e164: string | null;
  rsvp_attending: boolean | null;
  sms_opt_out: boolean | null;
};

type GuestListManagerProps = {
  eventId: string;
  tier: string;
  initialHouseholds: HouseholdRow[];
};

type ImportSource = "paste" | "csv";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parsePaste(raw: string): GuestImportRow[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, contact] = parseCsvLine(line);
      if (contact?.includes("@")) {
        return { name, email: contact };
      }
      return { name, phone: contact };
    });
}

function parseCsv(raw: string): GuestImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name" || h === "household_name");
  const emailIdx = headers.findIndex((h) => h === "email");
  const phoneIdx = headers.findIndex((h) => h === "phone");

  return lines.slice(1).map((line) => {
    const parts = parseCsvLine(line);
    return {
      name: parts[nameIdx] ?? "",
      email: emailIdx >= 0 ? parts[emailIdx] : "",
      phone: phoneIdx >= 0 ? parts[phoneIdx] : "",
    };
  });
}

export default function GuestListManager({
  eventId,
  tier,
  initialHouseholds,
}: GuestListManagerProps) {
  const [households, setHouseholds] = useState(initialHouseholds);
  const [importSource, setImportSource] = useState<ImportSource>("paste");
  const [rawText, setRawText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const previewRows = useMemo(() => {
    const rows = importSource === "paste" ? parsePaste(rawText) : parseCsv(csvText);
    const { normalized, errors } = validateImportRows(rows);
    return { rows: normalized, errors };
  }, [rawText, csvText, importSource]);

  const missingEmailCount = useMemo(
    () => households.filter((row) => !row.email).length,
    [households]
  );

  const refreshHouseholds = async () => {
    const res = await fetch(`/api/events/${eventId}/households`);
    const payload = (await res.json()) as { ok: boolean; households?: HouseholdRow[] };
    if (res.ok && payload.ok && payload.households) {
      setHouseholds(payload.households);
    }
  };

  const handleImport = async () => {
    setStatus(null);
    const rows = previewRows.rows;
    if (!rows.length || previewRows.errors.length > 0) {
      setStatus("Fix validation errors before importing.");
      return;
    }
    const payload = importSource === "paste" ? rawText : csvText;
    const res = await fetch(`/api/events/${eventId}/households/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: importSource,
        payload,
        mode: "overwrite",
      }),
    });
    const responseBody = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !responseBody.ok) {
      setStatus(responseBody.error ?? "Import failed.");
      return;
    }
    setStatus("Import completed.");
    setRawText("");
    setCsvText("");
    await refreshHouseholds();
  };

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Guest list</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Import guests and track contact information.
          </p>
          {tier !== "premium" ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Missing emails: {missingEmailCount}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex gap-2">
          {(["paste", "csv"] as ImportSource[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => setImportSource(source)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                importSource === source
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {source === "paste" ? "Paste list" : "CSV upload"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {importSource === "paste" ? (
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Name, email@ or +614..."
              className="h-40 w-full rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-900 shadow-sm"
            />
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setCsvText(await file.text());
                }}
              />
              {csvText ? (
                <p className="text-xs text-neutral-500">
                  CSV loaded. We expect headers: name, phone, email.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold">Preview (first 20)</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.rows.slice(0, 20).map((row, index) => {
                  const error = previewRows.errors.find((err) => err.index === index);
                  return (
                    <tr key={`${row.name}-${index}`} className="border-t border-neutral-100">
                      <td className="py-2 pr-3">{row.name || "—"}</td>
                      <td className="py-2 pr-3">{row.email ?? "—"}</td>
                      <td className="py-2 pr-3">{row.phone ?? "—"}</td>
                      <td className="py-2">
                        {error ? (
                          <span className="text-rose-600">{error.message}</span>
                        ) : (
                          <span className="text-emerald-600">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {previewRows.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-neutral-500">
                      Add data to preview.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleImport}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Import guests
          </button>
          {status ? <span className="text-sm text-neutral-600">{status}</span> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Guests</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">RSVP</th>
                <th className="py-2">Opt out</th>
              </tr>
            </thead>
            <tbody>
              {households.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100">
                  <td className="py-2 pr-3">{row.household_name ?? "—"}</td>
                  <td className="py-2 pr-3">{row.phone_e164 ?? "—"}</td>
                  <td className="py-2 pr-3">{row.email ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {row.rsvp_attending === true
                      ? "Yes"
                      : row.rsvp_attending === false
                        ? "No"
                        : "Unknown"}
                  </td>
                  <td className="py-2">{row.sms_opt_out ? "Yes" : "No"}</td>
                </tr>
              ))}
              {households.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-neutral-500">
                    No guests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
