import { createAdminClient } from "@/lib/supabaseAdmin";
import GuestListManager from "./GuestListManager";

type GuestsPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function GuestsPage({ params }: GuestsPageProps) {
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
    .select("id, tier")
    .eq("id", eventId)
    .maybeSingle();

  const { data: households } = await adminClient
    .from("households")
    .select("id, household_name, email, phone_e164, rsvp_attending, sms_opt_out")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (
    <GuestListManager
      eventId={eventId}
      tier={event?.tier ?? "standard"}
      initialHouseholds={(households ?? []) as Array<{
        id: string;
        household_name: string | null;
        email: string | null;
        phone_e164: string | null;
        rsvp_attending: boolean | null;
        sms_opt_out: boolean | null;
      }>}
    />
  );
}
