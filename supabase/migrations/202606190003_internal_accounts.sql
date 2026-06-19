create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email_updates boolean not null default false,
  deep_swamp_notifications boolean not null default false,
  feedback_contact boolean not null default false,
  email_preferences_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_users (clerk_user_id)
select distinct user_id
from (
  select user_id from public.frogs
  union
  select user_id from public.frog_events
) existing_users
where user_id is not null and user_id <> ''
on conflict (clerk_user_id) do nothing;

alter table public.frogs add column if not exists account_id uuid;
alter table public.frog_events add column if not exists account_id uuid;

update public.frogs frogs
set account_id = users.id
from public.app_users users
where frogs.account_id is null
  and users.clerk_user_id = frogs.user_id;

update public.frog_events events
set account_id = users.id
from public.app_users users
where events.account_id is null
  and users.clerk_user_id = events.user_id;

-- Keep account_id nullable for legacy rows that were recorded before auth was
-- connected. All new writes include account_id at the authenticated API layer.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'frogs_account_id_fkey') then
    alter table public.frogs
      add constraint frogs_account_id_fkey
      foreign key (account_id) references public.app_users(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'frog_events_account_id_fkey') then
    alter table public.frog_events
      add constraint frog_events_account_id_fkey
      foreign key (account_id) references public.app_users(id) on delete restrict;
  end if;
end $$;

create index if not exists frogs_account_created_idx
  on public.frogs (account_id, created_at desc);
create index if not exists frogs_account_active_idx
  on public.frogs (account_id, created_at desc)
  where status = 'active';
create index if not exists frog_events_account_created_idx
  on public.frog_events (account_id, created_at desc);

alter table public.app_users enable row level security;

-- Clerk authenticates at the Next.js API boundary. Database access remains
-- server-only through the Supabase secret/service-role key.
