import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";

type EventRow = {
  id: string;
  owner_user_id: string | null;
  paid: boolean | null;
  paid_at: string | null;
  stripe_checkout_session_id: string | null;
  last_payment_check_at: string | null;
};

type RefreshResult = {
  refreshed: boolean;
  reason?:
    | "not_owner"
    | "not_found"
    | "already_paid"
    | "missing_session"
    | "cooldown"
    | "stripe_error";
  event?: EventRow;
};

const CHECK_COOLDOWN_MS = 2 * 60 * 1000;

export async function refreshStripePaidStatus(
  eventId: string,
  userId: string
): Promise<RefreshResult> {
  const adminClient = createAdminClient();
  const { data: event } = await adminClient
    .from("events")
    .select(
      "id, owner_user_id, paid, paid_at, stripe_checkout_session_id, last_payment_check_at"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return { refreshed: false, reason: "not_found" };
  }

  if (event.owner_user_id !== userId) {
    return { refreshed: false, reason: "not_owner", event };
  }

  if (event.paid) {
    return { refreshed: false, reason: "already_paid", event };
  }

  if (!event.stripe_checkout_session_id) {
    return { refreshed: false, reason: "missing_session", event };
  }

  const lastCheck = event.last_payment_check_at
    ? new Date(event.last_payment_check_at).getTime()
    : null;
  if (lastCheck && Date.now() - lastCheck < CHECK_COOLDOWN_MS) {
    return { refreshed: false, reason: "cooldown", event };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { refreshed: false, reason: "stripe_error", event };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  let paidNow = false;
  try {
    const session = await stripe.checkout.sessions.retrieve(
      event.stripe_checkout_session_id
    );
    const paymentStatus = session.payment_status;
    const sessionComplete = session.status === "complete";
    paidNow = paymentStatus === "paid" && sessionComplete;
  } catch {
    await adminClient
      .from("events")
      .update({ last_payment_check_at: new Date().toISOString() })
      .eq("id", event.id);
    return { refreshed: false, reason: "stripe_error", event };
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    last_payment_check_at: nowIso,
  };

  if (paidNow) {
    updatePayload.paid = true;
    updatePayload.updated_at = nowIso;
    updatePayload.paid_at = event.paid_at ?? nowIso;
  }

  await adminClient.from("events").update(updatePayload).eq("id", event.id);

  return {
    refreshed: paidNow,
    event: {
      ...event,
      paid: paidNow ? true : event.paid,
      paid_at: paidNow ? event.paid_at ?? nowIso : event.paid_at,
      last_payment_check_at: nowIso,
    },
  };
}
