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
