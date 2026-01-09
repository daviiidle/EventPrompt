import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type Tier = "standard" | "premium";

type CreateCheckoutBody = {
  tier?: Tier;
  guestLimit?: number;
};

const PRICE_BY_TIER: Record<Exclude<Tier, "premium">, string | undefined> = {
  standard: process.env.STRIPE_PRICE_STANDARD,
};

const PREMIUM_GUEST_MIN = 50;
const PREMIUM_GUEST_MAX = 1000;
const PREMIUM_BASE_CENTS = 17900;
const PREMIUM_PER_GUEST_CENTS = 40;

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

  const guestLimit = body.guestLimit;
  if (tier === "premium") {
    if (
      typeof guestLimit !== "number" ||
      !Number.isFinite(guestLimit) ||
      guestLimit < PREMIUM_GUEST_MIN ||
      guestLimit > PREMIUM_GUEST_MAX
    ) {
      return NextResponse.json(
        { error: "Invalid guest limit for premium tier" },
        { status: 400 }
      );
    }
  }

  const priceId = tier === "standard" ? PRICE_BY_TIER[tier] : undefined;
  if (tier === "standard" && !priceId) {
    return NextResponse.json(
      {
        error:
          tier === "standard"
            ? `Missing Stripe price ID for tier: ${tier}`
            : "Missing Stripe price ID for premium tier",
      },
      { status: 500 }
    );
  }

  const accessToken = getAccessToken(req);
  const allowUnauthenticated = process.env.ALLOW_UNAUTHENTICATED_CHECKOUT === "true";
  if (!accessToken && !allowUnauthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  let ownerUserId: string | null = null;
  if (accessToken) {
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    ownerUserId = userData.user.id;
  }

  const eventPayload = {
    tier,
    paid: false,
    guest_limit: tier === "premium" ? guestLimit : null,
    ...(ownerUserId ? { owner_user_id: ownerUserId } : {}),
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      tier === "premium"
        ? [
            {
              price_data: {
                currency: "aud",
                product_data: {
                  name: "Premium",
                },
                unit_amount:
                  PREMIUM_BASE_CENTS +
                  Math.max(0, guestLimit! - PREMIUM_GUEST_MIN) * PREMIUM_PER_GUEST_CENTS,
              },
              quantity: 1,
            },
          ]
        : [{ price: priceId!, quantity: 1 }];

    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${appUrl}/checkout/success`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        eventId: eventData.id,
        tier,
      guestLimit: tier === "premium" ? String(guestLimit) : "",
    },
  });
  } catch {
    return NextResponse.json(
      { error: "Failed to create Stripe Checkout session" },
      { status: 502 }
    );
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
