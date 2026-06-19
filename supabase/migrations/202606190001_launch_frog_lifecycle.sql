create extension if not exists pgcrypto;

create table if not exists public.frogs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_dump text not null,
  frog text not null,
  chosen_task text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'not_completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.frogs add column if not exists chosen_task text;
alter table public.frogs add column if not exists status text not null default 'active';
alter table public.frogs add column if not exists completed_at timestamptz;
create index if not exists frogs_user_created_idx on public.frogs (user_id, created_at desc);

create table if not exists public.frog_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  frog_id uuid references public.frogs(id) on delete cascade,
  event_type text not null check (
    event_type in ('swamp_dumped', 'frog_assigned', 'frog_completed', 'frog_not_completed')
  ),
  raw_tasks text,
  frog_text text,
  action_text text,
  completed boolean,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.frog_events add column if not exists frog_id uuid references public.frogs(id) on delete cascade;
create index if not exists frog_events_user_created_idx on public.frog_events (user_id, created_at desc);
create index if not exists frog_events_type_created_idx on public.frog_events (event_type, created_at desc);

alter table public.frogs enable row level security;
alter table public.frog_events enable row level security;

-- The app accesses these tables only through authenticated server routes.
-- No anon policies are intentionally created; the service role bypasses RLS.
