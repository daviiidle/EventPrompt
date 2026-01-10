export type PremiumTier = {
  limit: number;
  priceCents: number;
  label?: string;
};

export const PREMIUM_TIERS: PremiumTier[] = [
  { limit: 50, priceCents: 17900 },
  { limit: 100, priceCents: 19900 },
  { limit: 150, priceCents: 22900 },
  { limit: 200, priceCents: 25900 },
  { limit: 300, priceCents: 31900 },
];

export const PREMIUM_TIER_LIMITS = PREMIUM_TIERS.map((tier) => tier.limit);

export const PREMIUM_GUEST_INPUT_MIN = 50;
export const PREMIUM_GUEST_INPUT_MAX = 2000;

export function snapToTier(desiredGuests: number) {
  const normalized = Number.isFinite(desiredGuests) ? desiredGuests : PREMIUM_TIERS[0].limit;
  if (normalized <= PREMIUM_TIERS[0].limit) {
    return PREMIUM_TIERS[0];
  }

  const match = PREMIUM_TIERS.find((tier) => normalized <= tier.limit);
  return match ?? PREMIUM_TIERS[PREMIUM_TIERS.length - 1];
}

export function isPremiumTierLimit(limit: number) {
  return PREMIUM_TIER_LIMITS.includes(limit);
}

if (process.env.NODE_ENV === "development" && process.env.PRICE_TIER_DEBUG === "true") {
  // Quick sanity check for tier snapping in dev.
  console.log("pricing tiers", {
    t76: snapToTier(76).limit,
    t101: snapToTier(101).limit,
    t999: snapToTier(999).limit,
  });
}
