# Stripe pricing env vars

## Standard
- `STRIPE_PRICE_STANDARD` (A$129)

## Premium (tiered pricing)
Premium pricing uses fixed Stripe Price IDs per guest-limit bucket.

Required env vars:
- `STRIPE_PRICE_PREMIUM_50` (up to 50 guests)
- `STRIPE_PRICE_PREMIUM_100` (up to 100 guests)
- `STRIPE_PRICE_PREMIUM_150` (up to 150 guests)
- `STRIPE_PRICE_PREMIUM_200` (up to 200 guests)
- `STRIPE_PRICE_PREMIUM_300` (up to 300 guests)

Guest counts snap up to the next bucket. Limits above the max tier are clamped.
