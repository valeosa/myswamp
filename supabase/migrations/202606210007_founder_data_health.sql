create or replace function public.get_founder_data_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'frogs', jsonb_build_object(
      'total', (select count(*) from public.frogs),
      'captured', (
        select count(*) from public.frogs
        where deep_swamp_capture_status = 'captured'
      ),
      'failed', (
        select count(*) from public.frogs
        where deep_swamp_capture_status = 'failed'
      ),
      'not_consented', (
        select count(*) from public.frogs
        where deep_swamp_capture_status = 'not_consented'
      ),
      'captured_snapshot_mismatches', (
        select count(*)
        from public.frogs frogs
        where frogs.deep_swamp_capture_status = 'captured'
          and (
            frogs.task_count is null
            or frogs.chosen_task_position is null
            or frogs.local_timezone is null
            or frogs.local_hour is null
            or frogs.local_weekday is null
            or (
              select count(*)
              from public.deep_swamp_task_items items
              where items.frog_id = frogs.id
            ) <> frogs.task_count
            or (
              select count(*)
              from public.deep_swamp_task_items items
              where items.frog_id = frogs.id and items.is_selected = true
            ) <> 1
          )
      )
    ),
    'lifecycle', jsonb_build_object(
      'outcome_mismatches', (
        select count(*)
        from public.frogs frogs
        where (
          frogs.status = 'completed'
          and not exists (
            select 1 from public.frog_events events
            where events.frog_id = frogs.id and events.event_type = 'frog_completed'
          )
        ) or (
          frogs.status = 'not_completed'
          and not exists (
            select 1 from public.frog_events events
            where events.frog_id = frogs.id and events.event_type = 'frog_not_completed'
          )
        )
      ),
      'active_with_outcome', (
        select count(*)
        from public.frogs frogs
        where frogs.status = 'active'
          and exists (
            select 1 from public.frog_events events
            where events.frog_id = frogs.id
              and events.event_type in ('frog_completed', 'frog_not_completed')
          )
      ),
      'cleared_tadpoles_without_event', (
        select count(*)
        from public.tadpoles tadpoles
        where tadpoles.status = 'cleared'
          and not exists (
            select 1 from public.tadpole_events events
            where events.tadpole_id = tadpoles.id
          )
      ),
      'active_tadpoles_with_event', (
        select count(*)
        from public.tadpoles tadpoles
        where tadpoles.status = 'active'
          and exists (
            select 1 from public.tadpole_events events
            where events.tadpole_id = tadpoles.id
          )
      )
    ),
    'provenance', jsonb_build_object(
      'modern', (
        select count(*) from public.frogs
        where generation_prompt_version is not null
      ),
      'legacy', (
        select count(*) from public.frogs
        where generation_prompt_version is null
      ),
      'modern_missing_position', (
        select count(*) from public.frogs
        where generation_prompt_version is not null
          and chosen_task_position is null
      ),
      'repaired', (
        select count(*) from public.frogs
        where generation_repaired = true
      )
    ),
    'water_marks', jsonb_build_object(
      'total', (select count(*) from public.memory_contexts),
      'current_version', (
        select count(*) from public.memory_contexts
        where context_version = 'water-context-v1'
      ),
      'legacy', (
        select count(*) from public.memory_contexts
        where context_version = 'legacy-v0'
      )
    ),
    'generated_at', now()
  );
$$;

revoke all on function public.get_founder_data_health() from public, anon, authenticated;
grant execute on function public.get_founder_data_health() to service_role;
