import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";

const REQUIRED_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export async function POST(request: Request) {
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

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const payload = await request.text();

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

  console.log("[stripe-webhook] event.type", event.type);
  console.log("[stripe-webhook] event.id", event.id);
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  console.log("[stripe-webhook] session.id", session.id);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({ id: event.id })
    .single();

  if (insertError) {
    const duplicate =
      insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("duplicate");
    if (duplicate) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    console.log("[stripe-webhook] webhook_events insert error", insertError.message);
  }

  const updatePayload: Record<string, unknown> = {
    paid: true,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: session.id,
    stripe_event_last_id: event.id,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("stripe_checkout_session_id", session.id)
    .select("id");

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }

  console.log(
    "[stripe-webhook] events updated",
    Array.isArray(updatedRows) ? updatedRows.length : 0
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
