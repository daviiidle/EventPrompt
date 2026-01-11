import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getR2Client } from "@/lib/r2";
import SeatingManager from "./SeatingManager";

type SeatingPageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function SeatingPage({ params }: SeatingPageProps) {
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
  const { data: plans } = await adminClient
    .from("seating_plans")
    .select("id, object_key, content_type, created_at, is_active")
    .eq("event_id", eventId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const plan = plans?.[0] ?? null;

  let viewUrl: string | null = null;
  if (plan?.object_key) {
    const bucket = process.env.R2_BUCKET_NAME;
    if (bucket) {
      const r2 = getR2Client();
      viewUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: bucket, Key: plan.object_key }),
        { expiresIn: 3600 }
      );
    }
  }

  const { data: tables } = await adminClient
    .from("seating_tables")
    .select("id, label, position, capacity, sort_order, seating_plan_id")
    .eq("seating_plan_id", plan?.id ?? "")
    .order("sort_order", { ascending: true });

  let assignments: Array<{
    id: string;
    seating_table_id: string;
    household_id: string;
  }> = [];

  if (tables && tables.length > 0) {
    const { data: assignmentRows } = await adminClient
      .from("seating_assignments")
      .select("id, seating_table_id, household_id")
      .in(
        "seating_table_id",
        tables.map((table) => table.id)
      );
    assignments = assignmentRows ?? [];
  }

  const { data: households } = await adminClient
    .from("households")
    .select("id, household_name, email, phone_e164")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (
    <SeatingManager
      eventId={eventId}
      plan={plan ? { ...plan, viewUrl } : null}
      tables={(tables ?? []) as Array<{
        id: string;
        label: string;
        position: { x: number; y: number };
        capacity: number;
      }>}
      assignments={assignments}
      households={(households ?? []) as Array<{
        id: string;
        household_name: string | null;
        email: string | null;
        phone_e164: string | null;
      }>}
    />
  );
}
