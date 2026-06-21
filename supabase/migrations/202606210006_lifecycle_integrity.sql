alter table public.frogs
  add column if not exists chosen_task_position smallint check (chosen_task_position >= 0),
  add column if not exists generation_source text check (generation_source in ('openai', 'deterministic')),
  add column if not exists generation_prompt_version text,
  add column if not exists generation_model text,
  add column if not exists generation_system_fingerprint text,
  add column if not exists generation_response_id text,
  add column if not exists generation_repaired boolean not null default false,
  add column if not exists deep_swamp_capture_status text not null default 'not_consented'
    check (deep_swamp_capture_status in ('not_consented', 'captured', 'failed'));

alter table public.frog_events
  add column if not exists local_timezone text,
  add column if not exists local_hour smallint check (local_hour between 0 and 23),
  add column if not exists local_weekday smallint check (local_weekday between 0 and 6),
  add column if not exists event_version text;

update public.frog_events set event_version = 'legacy-v0' where event_version is null;

alter table public.frog_events
  alter column event_version set default 'frog-event-v1',
  alter column event_version set not null;

alter table public.tadpoles
  add column if not exists cleared_local_timezone text,
  add column if not exists cleared_local_hour smallint check (cleared_local_hour between 0 and 23),
  add column if not exists cleared_local_weekday smallint check (cleared_local_weekday between 0 and 6);

alter table public.tadpole_events
  add column if not exists local_timezone text,
  add column if not exists local_hour smallint check (local_hour between 0 and 23),
  add column if not exists local_weekday smallint check (local_weekday between 0 and 6),
  add column if not exists event_version text;

update public.tadpole_events set event_version = 'legacy-v0' where event_version is null;

alter table public.tadpole_events
  alter column event_version set default 'tadpole-event-v1',
  alter column event_version set not null;

alter table public.memory_contexts
  add column if not exists context_version text;

update public.memory_contexts set context_version = 'legacy-v0' where context_version is null;

alter table public.memory_contexts
  alter column context_version set default 'water-context-v1',
  alter column context_version set not null;

update public.frogs frogs
set chosen_task_position = selected.position
from (
  select frog_id, min(position) as position
  from public.deep_swamp_task_items
  where is_selected = true
  group by frog_id
) selected
where frogs.id = selected.frog_id
  and frogs.chosen_task_position is null;

with ranked as (
  select id, row_number() over (partition by frog_id order by position, created_at, id) as selected_rank
  from public.deep_swamp_task_items
  where is_selected = true
)
update public.deep_swamp_task_items items
set is_selected = false
from ranked
where items.id = ranked.id
  and ranked.selected_rank > 1;

update public.frogs frogs
set deep_swamp_capture_status = case
  when (
    select count(*) from public.deep_swamp_task_items items where items.frog_id = frogs.id
  ) = frogs.task_count and (
    select count(*) from public.deep_swamp_task_items items
    where items.frog_id = frogs.id and items.is_selected = true
  ) = 1 and frogs.local_timezone is not null
    and frogs.local_hour is not null
    and frogs.local_weekday is not null then 'captured'
  when app_users.deep_swamp_analysis and frogs.deep_swamp_capture_version is not null then 'failed'
  else 'not_consented'
end
from public.app_users app_users
where frogs.account_id = app_users.id;

create unique index if not exists deep_swamp_one_selected_task_per_frog
  on public.deep_swamp_task_items (frog_id)
  where is_selected = true;

with ranked as (
  select id, row_number() over (
    partition by frog_id, event_type
    order by created_at, id
  ) as event_rank
  from public.frog_events
  where event_type in ('frog_completed', 'frog_not_completed')
)
delete from public.frog_events events
using ranked
where events.id = ranked.id
  and ranked.event_rank > 1;

create unique index if not exists frog_events_one_outcome_type_per_frog
  on public.frog_events (frog_id, event_type)
  where frog_id is not null
    and event_type in ('frog_completed', 'frog_not_completed');

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
      occurred_at,
      local_timezone,
      local_hour,
      local_weekday,
      event_version
    ) values (
      new.user_id,
      new.account_id,
      new.id,
      new.source_frog_id,
      'tadpole_cleared',
      new.clear_method,
      new.cleared_at,
      new.cleared_local_timezone,
      new.cleared_local_hour,
      new.cleared_local_weekday,
      'tadpole-event-v1'
    );
  end if;

  return new;
end;
$$;

create or replace function public.create_frog_assignment(p_payload jsonb)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid := (p_payload->>'account_id')::uuid;
  target_user_id text := p_payload->>'user_id';
  deep_enabled boolean := false;
  saved_frog_id uuid;
  saved_created_at timestamptz;
  captured_ok boolean := false;
begin
  select deep_swamp_analysis
  into deep_enabled
  from public.app_users
  where app_users.id = target_account_id
    and app_users.clerk_user_id = target_user_id;

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  insert into public.frogs (
    user_id,
    account_id,
    task_dump,
    frog,
    chosen_task,
    chosen_task_position,
    status,
    local_timezone,
    local_hour,
    local_weekday,
    task_count,
    deep_swamp_capture_version,
    deep_swamp_capture_status,
    generation_source,
    generation_prompt_version,
    generation_model,
    generation_system_fingerprint,
    generation_response_id,
    generation_repaired
  ) values (
    target_user_id,
    target_account_id,
    p_payload->>'task_dump',
    p_payload->>'frog',
    p_payload->>'chosen_task',
    (p_payload->>'chosen_task_position')::smallint,
    'active',
    case when deep_enabled then p_payload#>>'{context,timezone}' end,
    case when deep_enabled and p_payload#>>'{context,local_hour}' is not null then (p_payload#>>'{context,local_hour}')::smallint end,
    case when deep_enabled and p_payload#>>'{context,local_weekday}' is not null then (p_payload#>>'{context,local_weekday}')::smallint end,
    case when deep_enabled then (p_payload->>'task_count')::smallint end,
    case when deep_enabled then p_payload->>'capture_version' end,
    case
      when not deep_enabled then 'not_consented'
      when p_payload#>>'{context,timezone}' is null
        or p_payload#>>'{context,local_hour}' is null
        or p_payload#>>'{context,local_weekday}' is null then 'failed'
      else 'captured'
    end,
    p_payload#>>'{generation,source}',
    p_payload#>>'{generation,prompt_version}',
    p_payload#>>'{generation,model}',
    p_payload#>>'{generation,system_fingerprint}',
    p_payload#>>'{generation,response_id}',
    coalesce((p_payload#>>'{generation,repaired}')::boolean, false)
  ) returning frogs.id, frogs.created_at into saved_frog_id, saved_created_at;

  insert into public.frog_events (
    user_id, account_id, frog_id, event_type, raw_tasks,
    frog_text, action_text, event_version
  ) values
    (target_user_id, target_account_id, saved_frog_id, 'swamp_dumped', p_payload->>'task_dump', null, null, 'frog-event-v1'),
    (target_user_id, target_account_id, saved_frog_id, 'frog_assigned', p_payload->>'task_dump', p_payload->>'frog', p_payload->>'frog', 'frog-event-v1');

  insert into public.tadpoles (
    user_id, account_id, source_frog_id, position,
    task_text, task_key, created_at
  )
  select
    target_user_id,
    target_account_id,
    saved_frog_id,
    item.position,
    item.task_text,
    item.task_key,
    saved_created_at
  from jsonb_to_recordset(coalesce(p_payload->'tadpoles', '[]'::jsonb))
    as item(position smallint, task_text text, task_key text);

  if deep_enabled then
    begin
      insert into public.deep_swamp_task_items (
        frog_id, account_id, position, task_text, is_selected
      )
      select
        saved_frog_id,
        target_account_id,
        item.position,
        item.task_text,
        item.is_selected
      from jsonb_to_recordset(coalesce(p_payload->'deep_items', '[]'::jsonb))
        as item(position smallint, task_text text, is_selected boolean);

      captured_ok := true;
    exception when others then
      captured_ok := false;
    end;

    if not captured_ok then
      update public.frogs
      set deep_swamp_capture_status = 'failed'
      where frogs.id = saved_frog_id;
    end if;
  end if;

  return query select saved_frog_id, saved_created_at;
end;
$$;

create or replace function public.clear_tadpoles(
  p_account_id uuid,
  p_user_id text,
  p_tadpole_id uuid default null,
  p_clear_all boolean default false,
  p_context jsonb default null
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  deep_enabled boolean := false;
  v_cleared_at timestamptz := now();
begin
  select deep_swamp_analysis
  into deep_enabled
  from public.app_users
  where app_users.id = p_account_id
    and app_users.clerk_user_id = p_user_id
  for share;

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if not p_clear_all and p_tadpole_id is null then
    raise exception 'tadpole_id_required' using errcode = '22023';
  end if;

  return query
  update public.tadpoles
  set
    status = 'cleared',
    cleared_at = v_cleared_at,
    clear_method = case when p_clear_all then 'clear_all' else 'individual' end,
    cleared_local_timezone = case when deep_enabled then p_context->>'timezone' end,
    cleared_local_hour = case
      when deep_enabled and p_context->>'localHour' is not null
      then (p_context->>'localHour')::smallint
    end,
    cleared_local_weekday = case
      when deep_enabled and p_context->>'localWeekday' is not null
      then (p_context->>'localWeekday')::smallint
    end
  where tadpoles.account_id = p_account_id
    and tadpoles.user_id = p_user_id
    and tadpoles.status = 'active'
    and (p_clear_all or tadpoles.id = p_tadpole_id)
  returning tadpoles.id;
end;
$$;

create or replace function public.settle_frog(
  p_account_id uuid,
  p_user_id text,
  p_frog_id uuid,
  p_event_type text,
  p_context jsonb default null
)
returns table (status text, changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  target_status text;
  deep_enabled boolean := false;
  occurred_at timestamptz := now();
  frog_action text;
begin
  if p_event_type not in ('frog_completed', 'frog_not_completed') then
    raise exception 'invalid_event_type' using errcode = '22023';
  end if;

  select frogs.status, frogs.frog
  into current_status, frog_action
  from public.frogs
  where frogs.id = p_frog_id
    and frogs.account_id = p_account_id
    and frogs.user_id = p_user_id
  for update;

  if not found then
    raise exception 'frog_not_found' using errcode = 'P0002';
  end if;

  target_status := case when p_event_type = 'frog_completed' then 'completed' else 'not_completed' end;

  if current_status = target_status then
    return query select current_status, false;
    return;
  end if;

  if current_status = 'completed'
    or (target_status = 'not_completed' and current_status <> 'active') then
    raise exception 'invalid_frog_transition' using errcode = '22023';
  end if;

  select deep_swamp_analysis
  into deep_enabled
  from public.app_users
  where app_users.id = p_account_id;

  update public.frogs
  set
    status = target_status,
    completed_at = case when target_status = 'completed' then occurred_at else null end
  where frogs.id = p_frog_id;

  insert into public.frog_events (
    user_id,
    account_id,
    frog_id,
    event_type,
    frog_text,
    action_text,
    completed,
    completed_at,
    local_timezone,
    local_hour,
    local_weekday,
    event_version,
    created_at
  ) values (
    p_user_id,
    p_account_id,
    p_frog_id,
    p_event_type,
    frog_action,
    frog_action,
    target_status = 'completed',
    case when target_status = 'completed' then occurred_at else null end,
    case when deep_enabled then p_context->>'timezone' end,
    case when deep_enabled and p_context->>'localHour' is not null then (p_context->>'localHour')::smallint end,
    case when deep_enabled and p_context->>'localWeekday' is not null then (p_context->>'localWeekday')::smallint end,
    'frog-event-v1',
    occurred_at
  ) on conflict (frog_id, event_type) where frog_id is not null
    and event_type in ('frog_completed', 'frog_not_completed') do nothing;

  return query select target_status, true;
end;
$$;

create or replace function public.set_deep_swamp_consent(
  p_account_id uuid,
  p_user_id text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
  set
    deep_swamp_analysis = p_enabled,
    deep_swamp_consent_at = case when p_enabled then now() else null end,
    updated_at = now()
  where app_users.id = p_account_id
    and app_users.clerk_user_id = p_user_id;

  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if not p_enabled then
    delete from public.deep_swamp_task_items where account_id = p_account_id;

    update public.frogs
    set
      local_timezone = null,
      local_hour = null,
      local_weekday = null,
      task_count = null,
      deep_swamp_capture_version = null,
      deep_swamp_capture_status = 'not_consented'
    where account_id = p_account_id;

    update public.frog_events
    set local_timezone = null, local_hour = null, local_weekday = null
    where account_id = p_account_id;

    update public.tadpoles
    set
      category = null,
      is_physical = null,
      classification_version = null,
      classification_confidence = null,
      cleared_local_timezone = null,
      cleared_local_hour = null,
      cleared_local_weekday = null
    where account_id = p_account_id;

    update public.tadpole_events
    set local_timezone = null, local_hour = null, local_weekday = null
    where account_id = p_account_id;
  end if;
end;
$$;

revoke all on function public.create_frog_assignment(jsonb) from public, anon, authenticated;
revoke all on function public.settle_frog(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.clear_tadpoles(uuid, text, uuid, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.set_deep_swamp_consent(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.create_frog_assignment(jsonb) to service_role;
grant execute on function public.settle_frog(uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.clear_tadpoles(uuid, text, uuid, boolean, jsonb) to service_role;
grant execute on function public.set_deep_swamp_consent(uuid, text, boolean) to service_role;
