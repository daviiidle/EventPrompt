-- Guest email support, seating, and imports

alter table public.households
  add column if not exists email text;

create index if not exists households_email_idx
  on public.households (email);

alter table public.households
  add column if not exists has_email boolean
    generated always as (email is not null and length(trim(email)) > 0) stored;

alter table public.households
  add column if not exists has_phone boolean
    generated always as (phone_e164 is not null and length(trim(phone_e164)) > 0) stored;

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  reminder_step integer null,
  to_email text not null,
  subject text null,
  body text not null,
  status text not null default 'queued',
  provider_message_id text null,
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists email_messages_household_id_idx
  on public.email_messages (household_id);

create table if not exists public.seating_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  object_key text not null,
  content_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seating_plans_event_id_idx
  on public.seating_plans (event_id);

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  seating_plan_id uuid not null references public.seating_plans(id) on delete cascade,
  label text not null,
  position jsonb not null default '{}'::jsonb,
  capacity integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seating_tables_plan_id_idx
  on public.seating_tables (seating_plan_id);

create table if not exists public.seating_assignments (
  id uuid primary key default gen_random_uuid(),
  seating_table_id uuid not null references public.seating_tables(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  seat_label text null,
  created_at timestamptz not null default now()
);

create unique index if not exists seating_assignments_unique
  on public.seating_assignments (seating_table_id, household_id);

create table if not exists public.event_import_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null,
  source_url text null,
  source_hash text null,
  last_imported_at timestamptz null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_import_sources_event_id_idx
  on public.event_import_sources (event_id);

create table if not exists public.event_email_collection_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz null
);

create unique index if not exists event_email_collection_tokens_token_key
  on public.event_email_collection_tokens (token);

do $$
begin
  if not exists (
    select 1
      from pg_indexes
     where schemaname = 'public'
       and indexname = 'event_email_collection_tokens_active_unique'
  ) then
    create unique index event_email_collection_tokens_active_unique
      on public.event_email_collection_tokens(event_id)
      where status = 'active';
  end if;
end $$;

alter table public.email_messages enable row level security;
alter table public.seating_plans enable row level security;
alter table public.seating_tables enable row level security;
alter table public.seating_assignments enable row level security;
alter table public.event_import_sources enable row level security;
alter table public.event_email_collection_tokens enable row level security;

do $$
begin
  -- email_messages policies
  if not exists (select 1 from pg_policies where tablename = 'email_messages' and policyname = 'email_messages_owner_select') then
    create policy email_messages_owner_select on public.email_messages
      for select
      using (
        exists (
          select 1 from public.households h
          join public.events e on e.id = h.event_id
          where h.id = email_messages.household_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'email_messages' and policyname = 'email_messages_owner_insert') then
    create policy email_messages_owner_insert on public.email_messages
      for insert
      with check (
        exists (
          select 1 from public.households h
          join public.events e on e.id = h.event_id
          where h.id = email_messages.household_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'email_messages' and policyname = 'email_messages_owner_update') then
    create policy email_messages_owner_update on public.email_messages
      for update
      using (
        exists (
          select 1 from public.households h
          join public.events e on e.id = h.event_id
          where h.id = email_messages.household_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.households h
          join public.events e on e.id = h.event_id
          where h.id = email_messages.household_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;

  -- seating_plans policies
  if not exists (select 1 from pg_policies where tablename = 'seating_plans' and policyname = 'seating_plans_owner') then
    create policy seating_plans_owner on public.seating_plans
      for all
      using (
        exists (
          select 1 from public.events e
          where e.id = seating_plans.event_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events e
          where e.id = seating_plans.event_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;

  -- seating_tables policies
  if not exists (select 1 from pg_policies where tablename = 'seating_tables' and policyname = 'seating_tables_owner') then
    create policy seating_tables_owner on public.seating_tables
      for all
      using (
        exists (
          select 1 from public.seating_plans sp
          join public.events e on e.id = sp.event_id
          where sp.id = seating_tables.seating_plan_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.seating_plans sp
          join public.events e on e.id = sp.event_id
          where sp.id = seating_tables.seating_plan_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;

  -- seating_assignments policies
  if not exists (select 1 from pg_policies where tablename = 'seating_assignments' and policyname = 'seating_assignments_owner') then
    create policy seating_assignments_owner on public.seating_assignments
      for all
      using (
        exists (
          select 1 from public.seating_tables st
          join public.seating_plans sp on sp.id = st.seating_plan_id
          join public.events e on e.id = sp.event_id
          where st.id = seating_assignments.seating_table_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.seating_tables st
          join public.seating_plans sp on sp.id = st.seating_plan_id
          join public.events e on e.id = sp.event_id
          where st.id = seating_assignments.seating_table_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;

  -- event_import_sources policies
  if not exists (select 1 from pg_policies where tablename = 'event_import_sources' and policyname = 'event_import_sources_owner') then
    create policy event_import_sources_owner on public.event_import_sources
      for all
      using (
        exists (
          select 1 from public.events e
          where e.id = event_import_sources.event_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events e
          where e.id = event_import_sources.event_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;

  -- event_email_collection_tokens policies
  if not exists (select 1 from pg_policies where tablename = 'event_email_collection_tokens' and policyname = 'event_email_tokens_owner') then
    create policy event_email_tokens_owner on public.event_email_collection_tokens
      for all
      using (
        exists (
          select 1 from public.events e
          where e.id = event_email_collection_tokens.event_id
            and e.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.events e
          where e.id = event_email_collection_tokens.event_id
            and e.owner_user_id = auth.uid()
        )
      );
  end if;
end $$;
