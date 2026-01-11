import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getServerUser } from "@/lib/serverAuth";
import { getEventTitle } from "@/lib/eventUtils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  let { data: events, error: eventsError } = await adminClient
    .from("events")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if ((!events || events.length === 0) && user.email) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const { data: emailEvents } = await adminClient
      .from("events")
      .select("id, owner_user_id")
      .eq("owner_email", normalizedEmail)
      .is("owner_user_id", null);

    if (emailEvents && emailEvents.length > 0) {
      const ids = emailEvents.map((event) => event.id);
      await adminClient.from("events").update({ owner_user_id: user.id }).in("id", ids);
      const refreshed = await adminClient
        .from("events")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });
      events = refreshed.data ?? [];
      eventsError = refreshed.error ?? null;
    }
  }

  if (eventsError) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-4 text-sm text-neutral-600">Failed to load events.</p>
      </main>
    );
  }

  const paidEvents = (events ?? []).filter((event) => event.paid === true);

  if (!paidEvents || paidEvents.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-10 text-center text-gray-900 dark:text-white">
        <h1 className="text-2xl font-semibold">Payment required</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          Complete checkout to unlock your dashboard.
        </p>
        <Link
          href="/#pricing"
          className="mt-6 inline-flex rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Start checkout
        </Link>
      </main>
    );
  }

  if (paidEvents.length === 1) {
    redirect(`/dashboard/${paidEvents[0].id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-semibold">Select an event</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {paidEvents.map((event) => (
          <li key={event.id}>
            <Link
              href={`/dashboard/${event.id}`}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span>{getEventTitle(event)}</span>
              <span className="text-xs text-neutral-500">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
