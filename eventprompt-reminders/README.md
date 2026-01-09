# EventPrompt Reminders Worker

Cloudflare Worker for sending EventPrompt SMS reminders. Designed to match the current production behavior and deploy on every push to `main`.

## Local development

1) Install dependencies:

```bash
npm install
```

2) Run locally:

```bash
npx wrangler dev
```

## Manual deploy

```bash
npm run deploy
```

## Cloudflare deploy steps (from this repo)

1) Ensure `wrangler.toml` has the correct account:

```toml
account_id = "a2747d15b9ca06f56c6ef21388e22c3e"
```

2) Deploy with an API token (use one with Workers Scripts:Edit):

```bash
CLOUDFLARE_API_TOKEN=... npx wrangler deploy
```

3) Optional: add a custom route in the Cloudflare dashboard:
   Workers & Pages → `eventprompt-reminders` → Triggers → Routes → add `eventprompt.site/*`

4) Verify:
   - `https://eventprompt-reminders.daviiidle.workers.dev/health`
   - `https://eventprompt.site/health` (after route is added)

## Required secrets (Cloudflare dashboard)

Set these Worker environment variables in the Cloudflare dashboard (do not commit them to git):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER
- TWILIO_TEST_TO

Optional:

- APP_ENV
- DEBUG_TOKEN
- DEV_FORCE_TO
- REQUIRE_UNRESPONDED_ONLY

## Cron observability

Cron invocations are visible in Cloudflare Observability:

- Cloudflare Dashboard → Workers & Pages → `eventprompt-reminders` → Observability → Logs

You can filter logs for `CRON FIRED` to see scheduled runs.
