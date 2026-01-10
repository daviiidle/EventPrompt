import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { isPremiumTierLimit } from "@/lib/pricingTiers";

export const runtime = "nodejs";

const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export async function POST(req: NextRequest) {
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      return NextResponse.json(
        { error: `Missing required environment variable: ${key}` },
        { status: 500 }
      );
    }
  }
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "Missing required environment variable: SUPABASE_URL" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const payload = await req.text();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe signature" },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const eventId = session.metadata?.eventId;
  const tier = session.metadata?.tier;
  const guestLimitValue = session.metadata?.guestLimit;

  if (!eventId || (tier !== "standard" && tier !== "premium")) {
    return NextResponse.json(
      { error: "Missing metadata on checkout session" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const rawEmail =
    session.customer_details?.email ??
    session.customer_email ??
    null;
  const ownerEmail =
    typeof rawEmail === "string" && rawEmail.trim().length > 0
      ? rawEmail.trim().toLowerCase()
      : null;

  const guestLimit =
    tier === "premium" && guestLimitValue ? Number(guestLimitValue) : null;

  if (
    tier === "premium" &&
    (!guestLimit ||
      !Number.isFinite(guestLimit) ||
      !isPremiumTierLimit(guestLimit))
  ) {
    return NextResponse.json(
      { error: "Invalid guest limit on checkout session" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {
    paid: true,
    tier,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: session.id,
    guest_limit: guestLimit,
  };

  if (ownerEmail) {
    updatePayload.owner_email = ownerEmail;
  }

  const { error: updateError } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
