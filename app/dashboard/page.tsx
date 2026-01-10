import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { ensureActiveGuestToken } from "@/lib/guestTokens";
import { formatEventDate, getEventTitle } from "@/lib/eventUtils";
import { getServerUser } from "@/lib/serverAuth";
import { getAppUrl } from "@/lib/appUrl";
import GuestTokenPanel from "./GuestTokenPanel";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: { event?: string };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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
    const { data: emailEvents, error: emailError } = await adminClient
      .from("events")
      .select("*")
      .eq("owner_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (!emailError && emailEvents && emailEvents.length > 0) {
      events = emailEvents;
      eventsError = null;

      const unlinked = emailEvents.find((event) => !event.owner_user_id);
      if (unlinked?.id) {
        await adminClient
          .from("events")
          .update({ owner_user_id: user.id })
          .eq("id", unlinked.id)
          .is("owner_user_id", null);
      }
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

  if (!events || events.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-4 text-sm text-neutral-600">No events found for this account.</p>
      </main>
    );
  }

  const requestedEventId = searchParams?.event ?? "";
  const activeEvent =
    events.find((event) => event.id === requestedEventId) ?? events[0];

  let tokenRow: Awaited<ReturnType<typeof ensureActiveGuestToken>> | null = null;
  let tokenError: string | null = null;
  try {
    tokenRow = await ensureActiveGuestToken(activeEvent.id as string);
  } catch (error) {
    tokenError =
      error instanceof Error
        ? error.message
        : "Failed to load guest upload link.";
  }
  const title = getEventTitle(activeEvent);
  const eventDate = formatEventDate(activeEvent);
  const paidLabel = activeEvent.paid === true ? "Paid" : "Unpaid";
  const appUrl = await getAppUrl();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 text-gray-900 dark:text-white">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          Owner Dashboard
        </p>
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-neutral-700 dark:text-neutral-300">
          <span>{paidLabel}</span>
          {eventDate ? <span>{eventDate}</span> : null}
          {activeEvent.tier ? <span>Tier: {String(activeEvent.tier)}</span> : null}
        </div>
      </header>

      {events.length > 1 ? (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Your events</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {events.map((event) => {
              const label = getEventTitle(event);
              const isActive = event.id === activeEvent.id;
              return (
                <li key={event.id}>
                  <Link
                    href={`/dashboard?event=${event.id}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      isActive
                        ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                    }`}
                  >
                    <span>{label}</span>
                    {isActive ? <span className="text-xs">Selected</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tokenRow ? (
        <GuestTokenPanel
          eventId={activeEvent.id as string}
          baseUrl={appUrl}
          initialToken={tokenRow.token}
          initialExpiresAt={tokenRow.expires_at}
        />
      ) : (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {tokenError ?? "Unable to load guest upload link."}
        </section>
      )}
    </main>
  );
}
