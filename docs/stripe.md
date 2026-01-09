# Stripe pricing env vars

## Standard
- `STRIPE_PRICE_STANDARD` (A$129)

## Premium (dynamic pricing)
Premium pricing is calculated per guest and passed to Stripe as `price_data`.

Formula:
- Base A$179 for the first 50 guests
- +A$0.40 per additional guest
- Min 50 guests, max 1000 guests

No Stripe Price IDs are required for Premium.
