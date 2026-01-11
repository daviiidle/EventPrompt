"use client";

import { useMemo, useState } from "react";

type HouseholdRow = {
  id: string;
  household_name: string | null;
  email: string | null;
  phone_e164: string | null;
  rsvp_attending: boolean | null;
  sms_opt_out: boolean | null;
  rsvp_token: string | null;
};

type ReminderRow = {
  id: string;
  household_id: string;
  reminder_step: number | null;
  status: string | null;
};

type RsvpTableProps = {
  households: HouseholdRow[];
  reminderState: ReminderRow[];
};

type Filter = "all" | "yes" | "no" | "unknown";

export default function RsvpTable({ households, reminderState }: RsvpTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const reminderByHousehold = useMemo(() => {
    const map = new Map<string, ReminderRow>();
    reminderState.forEach((row) => {
      map.set(row.household_id, row);
    });
    return map;
  }, [reminderState]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return households.filter((household) => {
      if (filter === "yes" && household.rsvp_attending !== true) return false;
      if (filter === "no" && household.rsvp_attending !== false) return false;
      if (filter === "unknown" && household.rsvp_attending !== null) return false;

      if (!term) return true;
      return [household.household_name, household.email, household.phone_e164]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [households, filter, search]);

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">RSVP</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "yes", "no", "unknown"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                filter === item
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-900 text-white"
              }`}
            >
              {item === "all"
                ? "All"
                : item === "yes"
                  ? "Attending"
                  : item === "no"
                    ? "Not attending"
                    : "Not responded"}
            </button>
          ))}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone"
            className="ml-auto w-64 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4">Household</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">RSVP</th>
                <th className="py-2 pr-4">Opt out</th>
                <th className="py-2 pr-4">Reminder</th>
                <th className="py-2">RSVP link</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const reminder = reminderByHousehold.get(row.id);
                return (
                  <tr key={row.id} className="border-t border-neutral-100">
                    <td className="py-3 pr-4">{row.household_name ?? "Unnamed"}</td>
                    <td className="py-3 pr-4">
                      <div>{row.phone_e164 ?? "—"}</div>
                      <div className="text-xs text-neutral-500">{row.email ?? "—"}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {row.rsvp_attending === true
                        ? "Yes"
                        : row.rsvp_attending === false
                          ? "No"
                          : "Unknown"}
                    </td>
                    <td className="py-3 pr-4">{row.sms_opt_out ? "Yes" : "No"}</td>
                    <td className="py-3 pr-4">
                      {reminder ? `${reminder.reminder_step ?? "—"} (${reminder.status ?? "—"})` : "—"}
                    </td>
                    <td className="py-3">
                      {row.rsvp_token ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${window.location.origin}/rsvp/${row.rsvp_token}`
                            )
                          }
                          className="text-xs font-semibold text-neutral-700 underline"
                        >
                          Copy link
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-sm text-neutral-500">
                    No guests found.
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
