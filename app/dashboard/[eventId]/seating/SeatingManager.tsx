"use client";

import { useMemo, useRef, useState } from "react";

type Household = {
  id: string;
  household_name: string | null;
  email: string | null;
  phone_e164: string | null;
};

type SeatingPlan = {
  id: string;
  object_key: string;
  content_type: string;
  viewUrl?: string | null;
};

type SeatingTable = {
  id: string;
  label: string;
  position: { x: number; y: number };
  capacity: number;
};

type Assignment = {
  id: string;
  seating_table_id: string;
  household_id: string;
};

type SeatingManagerProps = {
  eventId: string;
  plan: SeatingPlan | null;
  tables: SeatingTable[];
  assignments: Assignment[];
  households: Household[];
};

export default function SeatingManager({
  eventId,
  plan: initialPlan,
  tables: initialTables,
  assignments: initialAssignments,
  households,
}: SeatingManagerProps) {
  const [plan, setPlan] = useState<SeatingPlan | null>(initialPlan);
  const [tables, setTables] = useState<SeatingTable[]>(initialTables);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialTables[0]?.id ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);

  const assignedByTable = useMemo(() => {
    const map = new Map<string, string[]>();
    assignments.forEach((item) => {
      if (!map.has(item.seating_table_id)) {
        map.set(item.seating_table_id, []);
      }
      map.get(item.seating_table_id)?.push(item.household_id);
    });
    return map;
  }, [assignments]);

  const unassigned = useMemo(() => {
    const assignedIds = new Set(assignments.map((item) => item.household_id));
    return households.filter((household) => !assignedIds.has(household.id));
  }, [assignments, households]);

  const selectedAssignments = useMemo(() => {
    if (!selectedTableId) return [];
    const ids = assignedByTable.get(selectedTableId) ?? [];
    return households.filter((household) => ids.includes(household.id));
  }, [assignedByTable, selectedTableId, households]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("file", file);
    try {
      const res = await fetch("/api/seating/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as { ok: boolean; plan?: SeatingPlan; error?: string };
      if (!res.ok || !payload.ok || !payload.plan) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      setPlan(payload.plan);
      setTables([]);
      setAssignments([]);
      setSelectedTableId(null);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddTable = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!plan || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const nextNumber =
      tables.reduce((max, table) => {
        const match = table.label.match(/table\s*(\d+)/i);
        const value = match ? Number(match[1]) : 0;
        return Number.isFinite(value) && value > max ? value : max;
      }, 0) + 1;
    const label = `Table ${nextNumber}`;

    const res = await fetch("/api/seating/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        seatingPlanId: plan.id,
        tables: [{ label, position: { x, y }, sort_order: nextNumber }],
      }),
    });
    const payload = (await res.json()) as { ok: boolean; tables?: SeatingTable[] };
    if (res.ok && payload.ok && payload.tables) {
      setTables((prev) => [...prev, ...payload.tables]);
      setSelectedTableId(payload.tables[0]?.id ?? null);
    }
  };

  const assignGuest = async (householdId: string) => {
    if (!selectedTableId) return;
    const res = await fetch("/api/seating/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        seatingTableId: selectedTableId,
        householdId,
        action: "assign",
      }),
    });
    if (!res.ok) return;
    setAssignments((prev) => [
      ...prev,
      {
        id: `${selectedTableId}-${householdId}`,
        seating_table_id: selectedTableId,
        household_id: householdId,
      },
    ]);
  };

  const unassignGuest = async (householdId: string) => {
    if (!selectedTableId) return;
    const res = await fetch("/api/seating/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        seatingTableId: selectedTableId,
        householdId,
        action: "unassign",
      }),
    });
    if (!res.ok) return;
    setAssignments((prev) =>
      prev.filter(
        (item) =>
          !(
            item.seating_table_id === selectedTableId &&
            item.household_id === householdId
          )
      )
    );
  };

  const filteredHouseholds = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return unassigned;
    return unassigned.filter((household) =>
      [household.household_name, household.email, household.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [search, unassigned]);

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">Seating</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Upload a seating plan image and click to place tables.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
          />
          {uploading ? <span className="text-sm">Uploading...</span> : null}
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {plan?.viewUrl ? (
            <div className="relative">
              <img
                ref={imageRef}
                src={plan.viewUrl}
                alt="Seating plan"
                className="w-full rounded-xl"
                onClick={handleAddTable}
              />
              {tables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setSelectedTableId(table.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs font-semibold ${
                    selectedTableId === table.id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700"
                  }`}
                  style={{
                    left: `${table.position.x * 100}%`,
                    top: `${table.position.y * 100}%`,
                  }}
                >
                  {table.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-neutral-500">
              Upload a seating plan to get started.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Table assignments</h2>
          {selectedTableId ? (
            <>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Assigned guests ({selectedAssignments.length})
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {selectedAssignments.map((guest) => (
                  <li key={guest.id} className="flex items-center justify-between text-sm">
                    <span>{guest.household_name ?? "Unnamed"}</span>
                    <button
                      type="button"
                      onClick={() => unassignGuest(guest.id)}
                      className="text-xs font-semibold text-rose-600"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {selectedAssignments.length === 0 ? (
                  <li className="text-sm text-neutral-500">No guests assigned yet.</li>
                ) : null}
              </ul>
              <div className="mt-4">
                <p className="text-sm font-semibold">Add guest</p>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone"
                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
                <ul className="mt-2 max-h-48 overflow-y-auto">
                  {filteredHouseholds.map((guest) => (
                    <li key={guest.id} className="flex items-center justify-between py-1 text-sm">
                      <span>{guest.household_name ?? "Unnamed"}</span>
                      <button
                        type="button"
                        onClick={() => assignGuest(guest.id)}
                        className="text-xs font-semibold text-neutral-700"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                  {filteredHouseholds.length === 0 ? (
                    <li className="text-xs text-neutral-500">No unassigned guests.</li>
                  ) : null}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">
              Select a table pin to manage assignments.
            </p>
          )}
          <p className="mt-4 text-xs text-neutral-500">
            Unassigned guests: {unassigned.length}
          </p>
        </div>
      </section>
    </main>
  );
}
