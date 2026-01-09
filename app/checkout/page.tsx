"use client";

import { useMemo, useState } from "react";

const STANDARD_PRICE = 129;
const PREMIUM_BASE_PRICE = 179;
const PREMIUM_MIN_GUESTS = 50;
const PREMIUM_MAX_GUESTS = 1000;
const PREMIUM_PER_GUEST = 0.4;

export default function CheckoutPage() {
  const [premiumGuestInput, setPremiumGuestInput] = useState("50");
  const [premiumGuestLimit, setPremiumGuestLimit] = useState(50);
  const [loadingTier, setLoadingTier] = useState<null | "standard" | "premium">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedGuestLimit = Number(premiumGuestInput);
  const isGuestInputValid =
    Number.isFinite(parsedGuestLimit) &&
    parsedGuestLimit >= PREMIUM_MIN_GUESTS &&
    parsedGuestLimit <= PREMIUM_MAX_GUESTS;

  const premiumPrice = useMemo(() => {
    return PREMIUM_BASE_PRICE + Math.max(0, premiumGuestLimit - PREMIUM_MIN_GUESTS) * PREMIUM_PER_GUEST;
  }, [premiumGuestLimit]);

  const formatPrice = (value: number) => {
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  };

  const startCheckout = async (tier: "standard" | "premium") => {
    setErrorMessage(null);
    setLoadingTier(tier);

    try {
      if (tier === "premium" && !isGuestInputValid) {
        throw new Error("Enter a guest limit between 50 and 1000.");
      }

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tier,
          guestLimit: tier === "premium" ? premiumGuestLimit : undefined,
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
            Use this page to test Checkout end-to-end. You must be logged in so the API can
            create an event for your account.
          </p>
        </header>

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
            <p className="mt-2 text-3xl font-semibold">A${formatPrice(premiumPrice)}</p>
            <p className="mt-2 text-sm text-slate-300">
              Includes 3 SMS reminders (21, 10, 3 days) and seating arrangements.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Guest limit
              </label>
              <input
                type="number"
                min={PREMIUM_MIN_GUESTS}
                max={PREMIUM_MAX_GUESTS}
                step={1}
                inputMode="numeric"
                value={premiumGuestInput}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setPremiumGuestInput(nextValue);
                  const nextNumber = Number(nextValue);
                  if (
                    Number.isFinite(nextNumber) &&
                    nextNumber >= PREMIUM_MIN_GUESTS &&
                    nextNumber <= PREMIUM_MAX_GUESTS
                  ) {
                    setPremiumGuestLimit(nextNumber);
                  }
                }}
                onBlur={() => {
                  if (!isGuestInputValid) {
                    setPremiumGuestInput(String(premiumGuestLimit));
                  }
                }}
                className="w-28 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm"
              />
              <span className="text-xs text-slate-400">50–1000</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">Prices scale by A$0.40 per additional guest.</p>
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
