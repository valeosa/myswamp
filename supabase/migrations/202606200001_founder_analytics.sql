create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (
    event_name in ('visit', 'task_dumped', 'frog_generated', 'frog_completed')
  ),
  path text check (path is null or char_length(path) <= 200),
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, occurred_at desc);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

-- Preserve useful launch history without duplicating it if this file is
-- intentionally re-run from the SQL editor.
do $$
begin
  if not exists (select 1 from public.analytics_events limit 1) then
    insert into public.analytics_events (event_name, occurred_at)
    select 'task_dumped', created_at
    from public.frog_events
    where event_type = 'swamp_dumped';

    insert into public.analytics_events (event_name, occurred_at)
    select 'frog_generated', created_at
    from public.frogs;

    insert into public.analytics_events (event_name, occurred_at)
    select 'frog_completed', created_at
    from public.frog_events
    where event_type = 'frog_completed';
  end if;
end $$;
