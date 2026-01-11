"use client";

import { useEffect, useMemo, useState } from "react";
import { HiCheck } from "react-icons/hi2";
import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { marketingCopy } from "content/marketing";
import { supabase } from "@/lib/supabaseClient";
import {
  PREMIUM_GUEST_INPUT_MAX,
  PREMIUM_GUEST_INPUT_MIN,
  PREMIUM_TIERS,
  snapToTier,
} from "@/lib/pricingTiers";

const Pricing = () => {
  const [loadingTier, setLoadingTier] = useState<null | "standard" | "premium">(null);
  const [premiumGuestInput, setPremiumGuestInput] = useState("75");
  const [desiredGuests, setDesiredGuests] = useState(75);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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

  const startCheckout = async (tier: "standard" | "premium") => {
    setCheckoutError(null);
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
      console.error(error);
      const message = error instanceof Error ? error.message : "We couldn’t start checkout. Please try again.";
      setCheckoutError(message);
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
            {marketingCopy.pricing.heading}
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Choose the plan that fits your event.
          </p>
        </div>
        <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Premium guest count
          </span>
          <input
            type="number"
            min={PREMIUM_GUEST_INPUT_MIN}
            max={PREMIUM_GUEST_INPUT_MAX}
            step={1}
            inputMode="numeric"
            className="w-36 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-center text-xs font-semibold text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200"
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
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Guests ({PREMIUM_GUEST_INPUT_MIN}–{PREMIUM_GUEST_INPUT_MAX})
          </span>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Selected: up to {selectedTier.limit} guests
        </p>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          We’ll automatically choose the next size up so you don’t run out on the day.
        </p>
        {isClamped ? (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            Over {maxTier.limit}? You’re on the largest tier. Contact us for bigger events.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm text-gray-600 dark:text-gray-300">
          {sessionEmail ? (
            <p>
              Checkout email: <span className="font-semibold text-gray-900 dark:text-white">{sessionEmail}</span>
            </p>
          ) : (
            <div className="w-full max-w-sm">
              <label
                htmlFor="pricing-email"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-emerald-200"
              >
                Email for checkout
              </label>
              <input
                id="pricing-email"
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm text-gray-900 shadow-lg shadow-emerald-500/10 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-white dark:placeholder:text-emerald-100/60"
              />
              <div className="mt-2 h-4" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {marketingCopy.pricing.plans.map((plan) => {
            const isLoading = loadingTier === plan.tier;
            const price =
              plan.tier === "premium" ? selectedTier.priceCents / 100 : plan.aud;
            const priceLabel = Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2);
            const guestLimitLine =
              plan.tier === "premium"
                ? `Includes SMS reminders for up to ${selectedTier.limit} guests`
                : "Flat price — no guest-based SMS limits";

            return (
              <div
                key={plan.name}
                className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-white">
                    A${priceLabel}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{guestLimitLine}</p>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{plan.description}</p>
                  <ul className="mt-5 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <HiCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className="mt-6 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black"
                  type="button"
                  onClick={() => startCheckout(plan.tier)}
                  disabled={isLoading || (plan.tier === "premium" && !isGuestInputValid)}
                >
                  {isLoading ? "Redirecting..." : plan.cta}
                </Button>
              </div>
            );
          })}
        </div>
        {checkoutError ? (
          <p className="mt-6 text-center text-sm text-rose-500">{checkoutError}</p>
        ) : null}
      </Container>
    </section>
  );
};

export default Pricing;
