import { PREMIUM_TIER_LIMITS } from "@/lib/pricingTiers";

const PREMIUM_PRICE_BY_LIMIT: Record<number, string | undefined> = {
  50: process.env.STRIPE_PRICE_PREMIUM_50,
  100: process.env.STRIPE_PRICE_PREMIUM_100,
  150: process.env.STRIPE_PRICE_PREMIUM_150,
  200: process.env.STRIPE_PRICE_PREMIUM_200,
  300: process.env.STRIPE_PRICE_PREMIUM_300,
};

export function getStandardPriceId() {
  const priceId = process.env.STRIPE_PRICE_STANDARD;
  if (!priceId) {
    throw new Error("Missing Stripe price ID for tier: standard");
  }
  return priceId;
}

export function getPremiumPriceIdForLimit(limit: number) {
  if (!PREMIUM_TIER_LIMITS.includes(limit)) {
    throw new Error(`Invalid premium tier limit: ${limit}`);
  }
  const priceId = PREMIUM_PRICE_BY_LIMIT[limit];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for premium tier limit: ${limit}`);
  }
  return priceId;
}
