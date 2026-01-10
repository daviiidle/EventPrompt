"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PREMIUM_GUEST_INPUT_MAX,
  PREMIUM_GUEST_INPUT_MIN,
  PREMIUM_TIERS,
  snapToTier,
} from "@/lib/pricingTiers";
import { supabase } from "@/lib/supabaseClient";

const STANDARD_PRICE = 129;

export default function CheckoutPage() {
  const [premiumGuestInput, setPremiumGuestInput] = useState("75");
  const [desiredGuests, setDesiredGuests] = useState(75);
  const [loadingTier, setLoadingTier] = useState<null | "standard" | "premium">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");

  const parsedGuestLimit = Number(premiumGuestInput);
  const isGuestInputValid =
    Number.isFinite(parsedGuestLimit) &&
    parsedGuestLimit >= PREMIUM_GUEST_INPUT_MIN &&
    parsedGuestLimit <= PREMIUM_GUEST_INPUT_MAX;

  const selectedTier = useMemo(() => snapToTier(desiredGuests), [desiredGuests]);
  const maxTier = PREMIUM_TIERS[PREMIUM_TIERS.length - 1];
  const isClamped = desiredGuests > maxTier.limit;

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email?.trim().toLowerCase() ?? null;
      if (isMounted) {
        setSessionEmail(email);
      }
    };

    loadSession().catch(() => null);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.trim().toLowerCase() ?? null;
      setSessionEmail(email);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const formatPrice = (value: number) => {
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  };

  const startCheckout = async (tier: "standard" | "premium") => {
    setErrorMessage(null);
    setLoadingTier(tier);

    try {
      if (tier === "premium" && !isGuestInputValid) {
        throw new Error(
          `Enter a guest count between ${PREMIUM_GUEST_INPUT_MIN} and ${PREMIUM_GUEST_INPUT_MAX}.`
        );
      }

      const resolvedEmail = (sessionEmail ?? ownerEmail).trim().toLowerCase();
      if (!resolvedEmail) {
        throw new Error("Enter your email to continue checkout.");
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tier,
          guest_limit: tier === "premium" ? selectedTier.limit : undefined,
          owner_email: resolvedEmail,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start checkout.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      setErrorMessage(message);
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Checkout testing</p>
          <h1 className="mt-3 text-3xl font-semibold">Stripe Checkout test page</h1>
          <p className="mt-2 text-sm text-slate-300">
            Use this page to test Checkout end-to-end.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Checkout email
          </p>
          {sessionEmail ? (
            <p className="mt-3 text-sm text-slate-200">{sessionEmail}</p>
          ) : (
            <input
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white"
            />
          )}
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Standard</h2>
            <p className="mt-2 text-3xl font-semibold">A${STANDARD_PRICE}</p>
            <p className="mt-2 text-sm text-slate-300">Flat price. No SMS reminders.</p>
            <button
              type="button"
              onClick={() => startCheckout("standard")}
              disabled={loadingTier !== null}
              className="mt-6 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingTier === "standard" ? "Redirecting..." : "Checkout standard"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Premium</h2>
            <p className="mt-2 text-3xl font-semibold">
              A${formatPrice(selectedTier.priceCents / 100)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Includes 3 SMS reminders (21, 10, 3 days) and seating arrangements.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Guest limit
              </label>
              <input
                type="number"
                min={PREMIUM_GUEST_INPUT_MIN}
                max={PREMIUM_GUEST_INPUT_MAX}
                step={1}
                inputMode="numeric"
                value={premiumGuestInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setPremiumGuestInput(nextValue);
                  const nextNumber = Number(nextValue);
                  if (
                    Number.isFinite(nextNumber) &&
                    nextNumber >= PREMIUM_GUEST_INPUT_MIN &&
                    nextNumber <= PREMIUM_GUEST_INPUT_MAX
                  ) {
                    setDesiredGuests(nextNumber);
                  }
                }}
                onBlur={() => {
                  if (!isGuestInputValid) {
                    setPremiumGuestInput(String(desiredGuests));
                  }
                }}
                className="w-28 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm"
              />
              <span className="text-xs text-slate-400">
                {PREMIUM_GUEST_INPUT_MIN}–{PREMIUM_GUEST_INPUT_MAX}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Selected: up to {selectedTier.limit} guests.
            </p>
            <p className="text-xs text-slate-400">
              We’ll automatically choose the next size up so you don’t run out on the day.
            </p>
            {isClamped ? (
              <p className="text-xs text-amber-300">
                Over {maxTier.limit}? You’re on the largest tier. Contact us for bigger events.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => startCheckout("premium")}
              disabled={loadingTier !== null || !isGuestInputValid}
              className="mt-6 w-full rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingTier === "premium" ? "Redirecting..." : "Checkout premium"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
