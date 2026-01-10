# Free Next JS Starter Template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?demo-description=A%20minimal%20Next.js%20template%20for%20building%20SaaS%20websites%20with%20only%20the%20essential%20dependencies.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F7guUYce8M9UWWL2id1Out%2F432b98af389e3b9605804849a726a258%2Fsaas.png&demo-title=Minimal%20Next.js%20SaaS%20Website%20Starter&demo-url=https%3A%2F%2Fnextjs-saas-starter-template.vercel.app%2F&from=templates&project-name=Minimal%20Next.js%20SaaS%20Website%20Starter&repository-name=next-js-saas-website-starter&repository-url=https%3A%2F%2Fgithub.com%2Ftalhatahir%2Fnextjs-saas-starter-template&skippable-integrations=1)

This is a starter template for a SaaS application built with Next.js. It uses the minimum amount of dependencies and tools to get you started.
Tailwind CSS is used for styling, and Next Themes is used for dark mode. React Icons is used for icons.

<img width="1525" alt="image" src="https://github.com/user-attachments/assets/68db6585-3807-49c0-89fc-7a298c2abb02">

### How to use

1. Clone the repository
2. Install dependencies `npm install`
3. Run the development server `npm run dev`

### Features

- Next.js 14 with app router
- Prebuilt components for a quick start
- Tailwind CSS
- Next Themes for dark mode
- React Icons

### Marketing content and sections

- Edit marketing copy, pricing, and FAQ data in `content/marketing.ts`
- Update homepage composition in `app/page.tsx`
- Add or modify section components in `components/marketing/`

### Backend datastore

- Supabase setup and secret handling: `docs/supabase.md`

### Guest uploads flow

Owner flow:
- Log in at `/login` and complete the magic link.
- Visit `/dashboard` to view event status and the guest upload link.
- Use “Rotate” to invalidate old links immediately and generate a new QR code.

Guest flow:
- Guests open `/u/<token>` without logging in.
- Uploads call `POST /api/r2/guest-create-upload-url` → PUT to R2 → `POST /api/r2/guest-record-upload`.
- Guest uploads insert into `event_photos` with `uploaded_by='guest'` and `guest_token_id`.

Guardrails:
- Tokens are random, single active per event, and can expire after the event date.
- Guest endpoints validate token status and paid events, plus file type/size caps.

### Stripe Checkout (one-time payments)

This project uses Stripe Checkout for one-off payments and unlocks features via `events.tier` and `events.paid`.

Key behaviors:
- Standard: A$129 flat (no SMS, no seating).
- Premium: dynamic pricing based on guest count (min 50, max 1000).
- Premium pricing formula: `A$179 + (guest_count - 50) * A$0.40`.
- Only Stripe webhooks mark an event as paid.
- Premium includes 3 SMS reminders (21, 10, 3 days before the event).

Required environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STANDARD` (Stripe Price ID for A$129)
- `NEXT_PUBLIC_APP_URL` (optional; falls back to request origin)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`

Optional dev-only flag:
- `ALLOW_UNAUTHENTICATED_CHECKOUT=true` allows checkout without auth for local testing.

API routes:
- `POST /api/stripe/create-checkout` creates an event and returns a Checkout URL.
- `POST /api/stripe/webhook` verifies Stripe signatures and marks events paid.

Test page:
- Visit `/checkout` to run a basic checkout flow with Standard/Premium buttons.

Database notes:
- Ensure `events` exists with `guest_limit`, `tier`, `paid`, and Stripe IDs.
- For early testing, `event_date` and `timezone` can be nullable.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/talhatahir)
