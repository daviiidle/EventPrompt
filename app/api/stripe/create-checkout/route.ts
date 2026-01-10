import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { isPremiumTierLimit } from "@/lib/pricingTiers";
import { getPremiumPriceIdForLimit, getStandardPriceId } from "@/lib/stripePrices";

type Tier = "standard" | "premium";

type CreateCheckoutBody = {
  tier?: Tier;
  guest_limit?: number;
  owner_email?: string;
};

const REQUIRED_ENV_VARS = ["STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

function getAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const cookieToken = req.cookies.get("sb-access-token")?.value;
  return cookieToken ?? null;
}

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

  let body: CreateCheckoutBody;
  try {
    body = (await req.json()) as CreateCheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tier = body.tier;
  if (tier !== "standard" && tier !== "premium") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const guestLimit = body.guest_limit;
  if (tier === "premium") {
    if (
      typeof guestLimit !== "number" ||
      !Number.isFinite(guestLimit) ||
      !isPremiumTierLimit(guestLimit)
    ) {
      return NextResponse.json(
        { error: "Invalid guest limit for premium tier" },
        { status: 400 }
      );
    }
  }

  let priceId: string | null = null;
  try {
    if (tier === "standard") {
      priceId = getStandardPriceId();
    } else if (tier === "premium" && typeof guestLimit === "number") {
      priceId = getPremiumPriceIdForLimit(guestLimit);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Missing Stripe price ID.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const accessToken = getAccessToken(req);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  let ownerUserId: string | null = null;
  let ownerEmail: string | null = null;
  if (accessToken) {
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (!userError && userData.user) {
      ownerUserId = userData.user.id;
      ownerEmail = userData.user.email
        ? userData.user.email.trim().toLowerCase()
        : null;
    }
  }

  const requestEmail = body.owner_email?.trim().toLowerCase();
  if (requestEmail) {
    ownerEmail = requestEmail;
  }

  if (!ownerEmail) {
    return NextResponse.json({ error: "Email is required for checkout." }, { status: 400 });
  }

  const eventPayload = {
    tier,
    paid: false,
    guest_limit: tier === "premium" ? guestLimit : null,
    ...(ownerUserId ? { owner_user_id: ownerUserId } : {}),
    ...(ownerEmail ? { owner_email: ownerEmail } : {}),
  };

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .insert(eventPayload)
    .select("id")
    .single();

  if (eventError || !eventData) {
    console.error("Failed to create event", eventError);
    return NextResponse.json(
      { error: eventError?.message ?? "Failed to create event" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.nextUrl.origin;

  let session: Stripe.Checkout.Session;
  try {
    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price ID for selected tier." },
        { status: 500 }
      );
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success?email=${encodeURIComponent(ownerEmail)}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      ...(ownerEmail ? { customer_email: ownerEmail } : {}),
      metadata: {
        eventId: eventData.id,
        tier,
        guestLimit: tier === "premium" ? String(guestLimit) : "",
      },
    });
  } catch (error) {
    console.error("Stripe Checkout session error", error);
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : "Failed to create Stripe Checkout session";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", eventData.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save Stripe session" },
      { status: 500 }
    );
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: session.url });
}
