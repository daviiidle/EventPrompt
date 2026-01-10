-- Guest upload tokens + event_photos origin metadata

create table if not exists public.event_guest_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  rotated_at timestamptz null,
  expires_at timestamptz null
);

create unique index if not exists event_guest_tokens_token_key
  on public.event_guest_tokens(token);

create index if not exists event_guest_tokens_event_id_idx
  on public.event_guest_tokens(event_id);

create index if not exists event_guest_tokens_status_idx
  on public.event_guest_tokens(status);

do $$
begin
  if not exists (
    select 1
      from pg_indexes
     where schemaname = 'public'
       and indexname = 'event_guest_tokens_active_unique'
  ) then
    create unique index event_guest_tokens_active_unique
      on public.event_guest_tokens(event_id)
      where status = 'active';
  end if;
end $$;

alter table public.event_photos
  add column if not exists uploaded_by text default 'owner';

alter table public.event_photos
  add column if not exists guest_token_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'event_photos_guest_token_id_fkey'
  ) then
    alter table public.event_photos
      add constraint event_photos_guest_token_id_fkey
      foreign key (guest_token_id) references public.event_guest_tokens(id)
      on delete set null;
  end if;
end $$;
