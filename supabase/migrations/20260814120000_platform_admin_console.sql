begin;

drop policy if exists profiles_select_platform_admin on public.profiles;
create policy profiles_select_platform_admin on public.profiles
for select to authenticated using (public.is_platform_admin());

create or replace function public.platform_admin_update_subscription(
  p_organization_id uuid,
  p_plan_id text,
  p_status public.subscription_status,
  p_period_end date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.subscriptions;
  new_row public.subscriptions;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required';
  end if;
  if not exists (select 1 from public.plans where id = p_plan_id and is_active) then
    raise exception 'Active plan not found';
  end if;

  select * into old_row from public.subscriptions where organization_id = p_organization_id for update;
  if not found then raise exception 'Subscription not found'; end if;

  update public.subscriptions
  set plan_id = p_plan_id,
      status = p_status,
      current_period_end = case when p_period_end is null then current_period_end else p_period_end::timestamptz end,
      canceled_at = case when p_status = 'canceled' then coalesce(canceled_at, now()) else null end,
      updated_at = now()
  where organization_id = p_organization_id
  returning * into new_row;

  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, old_data, new_data)
  values (p_organization_id, auth.uid(), 'platform.subscription.update', 'subscriptions', new_row.id::text, to_jsonb(old_row), to_jsonb(new_row));
end;
$$;

create or replace function public.platform_admin_update_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.organization_role,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.organization_members;
  new_row public.organization_members;
  active_owner_count integer;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required';
  end if;

  select * into old_row from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'Organization member not found'; end if;

  if old_row.role = 'owner' and old_row.is_active and (p_role <> 'owner' or not p_is_active) then
    select count(*)::integer into active_owner_count
    from public.organization_members
    where organization_id = p_organization_id and role = 'owner' and is_active and user_id <> p_user_id;
    if active_owner_count = 0 then raise exception 'The last active owner cannot be removed or disabled'; end if;
  end if;

  update public.organization_members
  set role = p_role, is_active = p_is_active
  where organization_id = p_organization_id and user_id = p_user_id
  returning * into new_row;

  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, old_data, new_data)
  values (p_organization_id, auth.uid(), 'platform.member.update', 'organization_members', p_user_id::text, to_jsonb(old_row), to_jsonb(new_row));
end;
$$;

create or replace function public.platform_admin_update_organization(
  p_organization_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.organizations;
  new_row public.organizations;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required';
  end if;

  select * into old_row from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'Organization not found'; end if;

  update public.organizations set is_active = p_is_active, updated_at = now()
  where id = p_organization_id returning * into new_row;

  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, old_data, new_data)
  values (p_organization_id, auth.uid(), 'platform.organization.update', 'organizations', p_organization_id::text, to_jsonb(old_row), to_jsonb(new_row));
end;
$$;

revoke all on function public.platform_admin_update_subscription(uuid, text, public.subscription_status, date) from public;
revoke all on function public.platform_admin_update_member(uuid, uuid, public.organization_role, boolean) from public;
revoke all on function public.platform_admin_update_organization(uuid, boolean) from public;
grant execute on function public.platform_admin_update_subscription(uuid, text, public.subscription_status, date) to authenticated;
grant execute on function public.platform_admin_update_member(uuid, uuid, public.organization_role, boolean) to authenticated;
grant execute on function public.platform_admin_update_organization(uuid, boolean) to authenticated;

commit;
