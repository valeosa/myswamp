create table if not exists public.frog_generation_quota_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('guest', 'signed_in')),
  key_hash text not null check (char_length(key_hash) between 32 and 128),
  account_id uuid references public.app_users(id) on delete cascade,
  occurred_on date not null default ((now() at time zone 'utc')::date),
  occurred_at timestamptz not null default now()
);

create index if not exists frog_generation_quota_key_day_idx
  on public.frog_generation_quota_events (scope, key_hash, occurred_on, occurred_at desc);

create index if not exists frog_generation_quota_account_time_idx
  on public.frog_generation_quota_events (account_id, occurred_at desc)
  where account_id is not null;

alter table public.frog_generation_quota_events enable row level security;
revoke all on public.frog_generation_quota_events from anon, authenticated;

create or replace function public.consume_frog_generation_quota(
  p_scope text,
  p_key_hash text,
  p_account_id uuid,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_day date := (now() at time zone 'utc')::date;
  used_count integer;
  seconds_until_reset integer;
begin
  if p_scope not in ('guest', 'signed_in') then
    raise exception 'invalid quota scope';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'invalid quota limit';
  end if;

  if p_key_hash is null or char_length(p_key_hash) < 32 then
    raise exception 'invalid quota key';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_key_hash || ':' || current_day::text, 0));

  select count(*)::integer
    into used_count
    from public.frog_generation_quota_events
    where scope = p_scope
      and key_hash = p_key_hash
      and occurred_on = current_day;

  seconds_until_reset := greatest(
    1,
    extract(epoch from (((current_day + 1)::timestamp at time zone 'utc') - now()))::integer
  );

  if used_count >= p_limit then
    return jsonb_build_object(
      'allowed', false,
      'limit', p_limit,
      'remaining', 0,
      'retry_after_seconds', seconds_until_reset
    );
  end if;

  insert into public.frog_generation_quota_events (scope, key_hash, account_id, occurred_on)
  values (p_scope, p_key_hash, p_account_id, current_day);

  return jsonb_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', greatest(0, p_limit - used_count - 1),
    'retry_after_seconds', seconds_until_reset
  );
end;
$$;

revoke all on function public.consume_frog_generation_quota(text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_frog_generation_quota(text, text, uuid, integer) to service_role;
