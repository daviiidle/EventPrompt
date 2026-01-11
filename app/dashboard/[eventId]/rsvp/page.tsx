import { createAdminClient } from "@/lib/supabaseAdmin";
import RsvpTable from "./RsvpTable";

type RsvpPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function RsvpPage({ params }: RsvpPageProps) {
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
  const { data: households } = await adminClient
    .from("households")
    .select("id, household_name, email, phone_e164, rsvp_attending, sms_opt_out, rsvp_token")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const householdIds = (households ?? []).map((row) => row.id);
  const { data: reminderState } = await adminClient
    .from("reminder_state")
    .select("id, household_id, reminder_step, status")
    .in("household_id", householdIds);

  return (
    <RsvpTable
      households={(households ?? []) as Array<{
        id: string;
        household_name: string | null;
        email: string | null;
        phone_e164: string | null;
        rsvp_attending: boolean | null;
        sms_opt_out: boolean | null;
        rsvp_token: string | null;
      }>}
      reminderState={(reminderState ?? []) as Array<{
        id: string;
        household_id: string;
        reminder_step: number | null;
        status: string | null;
      }>}
    />
  );
}
