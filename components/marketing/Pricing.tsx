"use client";

import { useState } from "react";
import { HiCheck } from "react-icons/hi2";
import Container from "components/ui/Container";
import Button from "components/ui/Button";
import { marketingCopy } from "content/marketing";

const Pricing = () => {
  const [loadingTier, setLoadingTier] = useState<null | "standard" | "premium">(null);
  const [premiumGuestLimit, setPremiumGuestLimit] = useState(50);
  const [premiumGuestInput, setPremiumGuestInput] = useState("50");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const premiumBasePrice = 179;
  const premiumMinGuests = 50;
  const premiumMaxGuests = 1000;
  const premiumPerGuest = 0.4;

  const parsedGuestLimit = Number(premiumGuestInput);
  const isGuestInputValid =
    Number.isFinite(parsedGuestLimit) &&
    parsedGuestLimit >= premiumMinGuests &&
    parsedGuestLimit <= premiumMaxGuests;

  const premiumPrice =
    premiumBasePrice +
    Math.max(0, premiumGuestLimit - premiumMinGuests) * premiumPerGuest;

  const startCheckout = async (tier: "standard" | "premium") => {
    setCheckoutError(null);
    setLoadingTier(tier);
    try {
      if (tier === "premium" && !isGuestInputValid) {
        throw new Error("Guest limit out of range.");
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
        if (response.status === 401) {
          throw new Error("Please sign in before starting checkout.");
        }
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
            Premium guest limit
          </span>
          <input
            type="number"
            min={premiumMinGuests}
            max={premiumMaxGuests}
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
                nextNumber >= premiumMinGuests &&
                nextNumber <= premiumMaxGuests
              ) {
                setPremiumGuestLimit(nextNumber);
              }
            }}
            onBlur={() => {
              if (!isGuestInputValid) {
                setPremiumGuestInput(String(premiumGuestLimit));
              }
            }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">Guests (50–1000)</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {marketingCopy.pricing.plans.map((plan) => {
            const isLoading = loadingTier === plan.tier;
            const price = plan.tier === "premium" ? premiumPrice : plan.aud;
            const priceLabel = Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2);
            const guestLimitLine =
              plan.tier === "premium"
                ? `Includes SMS reminders for up to ${premiumGuestLimit} guests`
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
