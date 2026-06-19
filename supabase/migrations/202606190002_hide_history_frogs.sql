alter table public.frogs add column if not exists hidden_at timestamptz;

create index if not exists frogs_visible_history_idx
  on public.frogs (user_id, created_at desc)
  where hidden_at is null;
