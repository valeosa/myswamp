alter table public.app_users
  add column if not exists deep_swamp_analysis boolean not null default false,
  add column if not exists deep_swamp_consent_at timestamptz;

alter table public.frogs
  add column if not exists local_timezone text,
  add column if not exists local_hour smallint check (local_hour between 0 and 23),
  add column if not exists local_weekday smallint check (local_weekday between 0 and 6),
  add column if not exists task_count smallint check (task_count > 0),
  add column if not exists deep_swamp_capture_version text;

create table if not exists public.deep_swamp_task_items (
  id uuid primary key default gen_random_uuid(),
  frog_id uuid not null references public.frogs(id) on delete cascade,
  account_id uuid not null references public.app_users(id) on delete cascade,
  position smallint not null check (position >= 0),
  task_text text not null,
  is_selected boolean not null default false,
  category text check (
    category is null or category in (
      'admin', 'creative', 'domestic', 'financial', 'health',
      'school', 'social', 'work', 'other'
    )
  ),
  deadline_at timestamptz,
  deadline_is_inferred boolean,
  someone_waiting boolean,
  social_obligation boolean,
  classification_version text,
  classification_confidence numeric check (
    classification_confidence is null
    or classification_confidence between 0 and 1
  ),
  created_at timestamptz not null default now(),
  unique (frog_id, position)
);

create index if not exists deep_swamp_items_account_created_idx
  on public.deep_swamp_task_items (account_id, created_at desc);
create index if not exists deep_swamp_items_frog_idx
  on public.deep_swamp_task_items (frog_id, position);
create index if not exists frog_events_frog_type_created_idx
  on public.frog_events (frog_id, event_type, created_at);

alter table public.deep_swamp_task_items enable row level security;
revoke all on public.deep_swamp_task_items from anon, authenticated;

create table if not exists public.deep_swamp_consent_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_users(id) on delete cascade,
  granted boolean not null,
  notice_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists deep_swamp_consent_account_created_idx
  on public.deep_swamp_consent_events (account_id, created_at desc);

alter table public.deep_swamp_consent_events enable row level security;
revoke all on public.deep_swamp_consent_events from anon, authenticated;

create or replace function public.record_deep_swamp_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deep_swamp_analysis is distinct from old.deep_swamp_analysis then
    insert into public.deep_swamp_consent_events (
      account_id,
      granted,
      notice_version
    ) values (
      new.id,
      new.deep_swamp_analysis,
      '2026-06-20-v1'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists deep_swamp_consent_change on public.app_users;
create trigger deep_swamp_consent_change
after update of deep_swamp_analysis on public.app_users
for each row execute function public.record_deep_swamp_consent_change();
