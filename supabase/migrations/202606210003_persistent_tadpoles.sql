create table if not exists public.tadpoles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  account_id uuid not null references public.app_users(id) on delete cascade,
  source_frog_id uuid not null references public.frogs(id) on delete cascade,
  position smallint not null check (position >= 0),
  task_text text not null,
  task_key text not null,
  status text not null default 'active' check (status in ('active', 'cleared')),
  cleared_at timestamptz,
  clear_method text check (clear_method is null or clear_method in ('individual', 'clear_all')),
  category text check (
    category is null or category in (
      'admin', 'creative', 'domestic', 'financial', 'health',
      'school', 'social', 'work', 'other'
    )
  ),
  is_physical boolean,
  classification_version text,
  classification_confidence numeric check (
    classification_confidence is null
    or classification_confidence between 0 and 1
  ),
  created_at timestamptz not null default now(),
  unique (source_frog_id, position),
  check (
    (status = 'active' and cleared_at is null and clear_method is null)
    or (status = 'cleared' and cleared_at is not null and clear_method is not null)
  )
);

alter table public.deep_swamp_task_items
  add column if not exists is_physical boolean;

create unique index if not exists tadpoles_active_task_unique
  on public.tadpoles (account_id, task_key)
  where status = 'active';
create index if not exists tadpoles_account_status_created_idx
  on public.tadpoles (account_id, status, created_at);
create index if not exists tadpoles_source_frog_idx
  on public.tadpoles (source_frog_id, position);

alter table public.tadpoles enable row level security;
revoke all on public.tadpoles from anon, authenticated;

create table if not exists public.tadpole_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  account_id uuid not null references public.app_users(id) on delete cascade,
  tadpole_id uuid not null references public.tadpoles(id) on delete cascade,
  source_frog_id uuid not null references public.frogs(id) on delete cascade,
  event_type text not null check (event_type = 'tadpole_cleared'),
  clear_method text not null check (clear_method in ('individual', 'clear_all')),
  occurred_at timestamptz not null default now()
);

create index if not exists tadpole_events_account_time_idx
  on public.tadpole_events (account_id, occurred_at desc);
create index if not exists tadpole_events_source_frog_idx
  on public.tadpole_events (source_frog_id, occurred_at);

alter table public.tadpole_events enable row level security;
revoke all on public.tadpole_events from anon, authenticated;

create or replace function public.record_tadpole_clear()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active' and new.status = 'cleared' then
    insert into public.tadpole_events (
      user_id,
      account_id,
      tadpole_id,
      source_frog_id,
      event_type,
      clear_method,
      occurred_at
    ) values (
      new.user_id,
      new.account_id,
      new.id,
      new.source_frog_id,
      'tadpole_cleared',
      new.clear_method,
      new.cleared_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tadpole_clear_event on public.tadpoles;
create trigger tadpole_clear_event
after update of status on public.tadpoles
for each row execute function public.record_tadpole_clear();

-- Backfill task-item snapshots already collected with Deep Swamp consent.
-- Other active/pending legacy frogs are backfilled safely by /api/current.
insert into public.tadpoles (
  user_id,
  account_id,
  source_frog_id,
  position,
  task_text,
  task_key,
  created_at
)
select
  frogs.user_id,
  items.account_id,
  items.frog_id,
  items.position,
  items.task_text,
  trim(regexp_replace(regexp_replace(lower(items.task_text), '[^a-z0-9[:space:]]', '', 'g'), '[[:space:]]+', ' ', 'g')),
  frogs.created_at
from public.deep_swamp_task_items items
join public.frogs frogs on frogs.id = items.frog_id
where items.is_selected = false
on conflict do nothing;
