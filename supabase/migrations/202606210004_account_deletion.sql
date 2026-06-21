create or replace function public.delete_my_swamp_account_data(p_clerk_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
begin
  select id into target_account_id
  from public.app_users
  where clerk_user_id = p_clerk_user_id;

  if target_account_id is null then
    return;
  end if;

  delete from public.tadpole_events where account_id = target_account_id;
  delete from public.tadpoles where account_id = target_account_id;
  delete from public.deep_swamp_task_items where account_id = target_account_id;
  delete from public.frog_events where account_id = target_account_id;
  delete from public.memory_contexts where account_id = target_account_id;
  delete from public.deep_swamp_consent_events where account_id = target_account_id;
  delete from public.frogs where account_id = target_account_id;
  delete from public.app_users where id = target_account_id;
end;
$$;

revoke all on function public.delete_my_swamp_account_data(text) from public, anon, authenticated;
grant execute on function public.delete_my_swamp_account_data(text) to service_role;
