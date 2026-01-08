# Supabase setup

## Purpose
Store event, guest, and message data in Supabase (Postgres) and keep credentials out of the repo.

## Project creation
1. Create a Supabase project for EventPrompt.
2. Note the project URL and anon/service role keys.

## Required environment variables
Use these names in your hosting provider and CI:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## GitHub Secrets
Store production values in GitHub Secrets (not in the repo):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Google Apps Script
Do not store production secrets in Apps Script properties or source.

## Local connection test
Create the test table once in the Supabase SQL editor:

```sql
-- scripts/sql/connection_tests.sql
create table if not exists public.connection_tests (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);
```

Then run the Node script to verify your credentials and insert a row:

```bash
node scripts/test_supabase_connection.mjs
```

This uses the service role key to call the Supabase Auth admin API.
