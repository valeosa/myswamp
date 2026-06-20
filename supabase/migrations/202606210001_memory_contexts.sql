create table if not exists public.memory_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  account_id uuid not null references public.app_users(id) on delete cascade,
  season text not null check (season in ('spring', 'summer', 'autumn', 'winter')),
  life_context text not null check (
    life_context in ('school', 'work', 'travel', 'family', 'health', 'money', 'moving', 'exams', 'other')
  ),
  energy text not null check (energy in ('low', 'okay', 'wired', 'scattered', 'calm')),
  moment text not null check (
    moment in ('normal day', 'transition', 'deadline', 'holiday', 'after something big')
  ),
  created_at timestamptz not null default now()
);

create index if not exists memory_contexts_account_created_idx
  on public.memory_contexts (account_id, created_at desc);

alter table public.memory_contexts enable row level security;
revoke all on public.memory_contexts from anon, authenticated;

-- A mark begins an era. When analysing a frog, use the newest context for
-- the same account whose created_at is at or before the frog's created_at.
