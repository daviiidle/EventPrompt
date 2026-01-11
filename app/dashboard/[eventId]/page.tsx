import { createAdminClient } from "@/lib/supabaseAdmin";
import { formatEventDate, getEventTitle } from "@/lib/eventUtils";
import { getAppUrl } from "@/lib/appUrl";
import GuestTokenPanel from "../GuestTokenPanel";
import { ensureActiveGuestToken } from "@/lib/guestTokens";
import EventNameEditor from "./EventNameEditor";

type OverviewPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function OverviewPage({ params }: OverviewPageProps) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId?.trim();
  if (!eventId) {
    return (
      <main className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        Missing event.
      </main>
    );
  }

  const adminClient = createAdminClient();
  const { data: event } = await adminClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  const { data: households } = await adminClient
    .from("households")
    .select("id, email, phone_e164, rsvp_attending")
    .eq("event_id", eventId);

  const totalGuests = households?.length ?? 0;
  const rsvpYes = households?.filter((h) => h.rsvp_attending === true).length ?? 0;
  const rsvpNo = households?.filter((h) => h.rsvp_attending === false).length ?? 0;
  const rsvpUnknown = totalGuests - rsvpYes - rsvpNo;
  const missingEmail = households?.filter((h) => !h.email).length ?? 0;
  const missingPhone = households?.filter((h) => !h.phone_e164).length ?? 0;

  let tokenRow: Awaited<ReturnType<typeof ensureActiveGuestToken>> | null = null;
  try {
    tokenRow = await ensureActiveGuestToken(eventId);
  } catch {
    tokenRow = null;
  }

  const appUrl = await getAppUrl();
  const title = event ? getEventTitle(event) : "Event";
  const eventDate = event ? formatEventDate(event) : null;
  const rawEventName =
    (event?.event_name ?? event?.title ?? event?.name ?? event?.event_title) || "";

  return (
    <main className="flex flex-col gap-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <span>Status: {event?.paid ? "Paid" : "Unpaid"}</span>
          {event?.tier ? <span>Tier: {String(event.tier)}</span> : null}
          {eventDate ? <span>Date: {eventDate}</span> : null}
          {event?.guest_limit ? <span>Guest limit: {event.guest_limit}</span> : null}
          {event?.created_at ? (
            <span>Created: {new Date(event.created_at).toLocaleDateString()}</span>
          ) : null}
        </div>
      </section>

      <EventNameEditor eventId={eventId} initialName={rawEventName} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Total guests</p>
          <p className="mt-2 text-2xl font-semibold">{totalGuests}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-wide text-neutral-500">RSVP yes/no/unknown</p>
          <p className="mt-2 text-lg font-semibold">
            {rsvpYes} / {rsvpNo} / {rsvpUnknown}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Missing emails</p>
          <p className="mt-2 text-2xl font-semibold">{missingEmail}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Missing phones</p>
          <p className="mt-2 text-2xl font-semibold">{missingPhone}</p>
        </div>
      </section>

      {tokenRow ? (
        <GuestTokenPanel
          eventId={eventId}
          baseUrl={appUrl}
          initialToken={tokenRow.token}
          initialExpiresAt={tokenRow.expires_at}
        />
      ) : (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900">
          Unable to load guest upload link.
        </section>
      )}
    </main>
  );
}
