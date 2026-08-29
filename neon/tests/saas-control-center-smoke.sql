\set ON_ERROR_STOP on

begin;

create or replace function app_auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('app.test_uid', true), '')::uuid $$;

select set_config('app.test_uid', '11111111-1111-1111-1111-111111111111', false);

insert into app_auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'member@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'blocked@test.local');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Test owner'),
  ('22222222-2222-2222-2222-222222222222', 'Test member'),
  ('33333333-3333-3333-3333-333333333333', 'Blocked member');

insert into public.plans
  (id, name_ar, name_en, max_users, max_active_vehicles, max_storage_mb, trial_days, is_public, is_active, monthly_price_lyd, annual_price_lyd, features)
values
  ('smoke', 'اختبار', 'Smoke', 2, 5, 100, 14, false, true, 10, 100, '["core"]'::jsonb);

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select 'smoke', code, true,
  case code when 'team_members' then 2 when 'active_vehicles' then 5 when 'storage_mb' then 100 else null end
from public.feature_catalog;

insert into public.organizations (id, name, slug, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Smoke Org', 'smoke-org', '11111111-1111-1111-1111-111111111111');

insert into public.organization_members (organization_id, user_id, role, is_active, invited_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', true, '11111111-1111-1111-1111-111111111111');

insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'smoke', 'trialing', now() + interval '14 days');

insert into public.organization_members (organization_id, user_id, role, is_active, invited_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'viewer', true, '11111111-1111-1111-1111-111111111111');

do $$
begin
  begin
    insert into public.organization_members (organization_id, user_id, role, is_active, invited_by)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'viewer', true, '11111111-1111-1111-1111-111111111111');
    raise exception 'Expected user limit rejection';
  exception when others then
    if sqlerrm not in ('feature_limit_reached', 'user_limit_reached') then raise; end if;
  end;
end;
$$;

select public.record_usage_event(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'vehicle_center', 'page_view', '/cars', 'mobile', 'Chrome', 'Android'
);

do $$
declare result record;
begin
  select * into result from public.subscription_feature_entitlement('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'watchlist');
  if result.enabled is not true or result.reason <> 'allowed' then raise exception 'Entitlement smoke test failed'; end if;
  if (select active_users from public.usage_counters where organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 1 then raise exception 'Usage aggregation failed'; end if;
end;
$$;

insert into public.platform_admins (user_id) values ('11111111-1111-1111-1111-111111111111');

select public.platform_admin_configure_plan(
  'smoke', 'اختبار مطور', 'Smoke Plus', 12, 120, 3, 10, 250, 7, true, true,
  '["core","reports"]'::jsonb,
  '[{"feature_code":"watchlist","enabled":true,"limit_value":null}]'::jsonb
);

select public.platform_admin_publish_release(
  '9.9.9-test', 'إصدار اختبار', 'Smoke release', 'اختبار', 'Test', '["smoke"]'::jsonb, true
);

do $$
begin
  if (select count(*) from public.plan_price_versions where plan_id = 'smoke' and effective_to is null) <> 2 then raise exception 'Price versioning failed'; end if;
  if not exists (select 1 from public.audit_logs where action = 'platform.plan.configure') then raise exception 'Plan audit failed'; end if;
  if not exists (select 1 from public.release_notes where version = '9.9.9-test' and status = 'published') then raise exception 'Release log failed'; end if;
end;
$$;

rollback;

select 'saas_control_center_smoke_ok' as result;
