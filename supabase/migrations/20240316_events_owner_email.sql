-- Store owner email for pre-auth gating

alter table public.events
  add column if not exists owner_email text;

create index if not exists idx_events_owner_email
  on public.events (owner_email);

do $$
begin
  begin
    alter table public.events
      add constraint events_owner_email_format_chk
      check (owner_email is null or position('@' in owner_email) > 1);
  exception when duplicate_object then null;
  end;
end $$;
