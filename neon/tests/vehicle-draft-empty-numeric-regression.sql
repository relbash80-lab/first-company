\set ON_ERROR_STOP on

begin;

create or replace function app_auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('app.test_uid', true), '')::uuid $$;

select set_config('app.test_uid', '44444444-4444-4444-4444-444444444444', false);

insert into app_auth.users (id, email)
values ('44444444-4444-4444-4444-444444444444', 'draft-regression@test.local');

insert into public.profiles (id, display_name)
values ('44444444-4444-4444-4444-444444444444', 'Draft regression');

insert into public.plans
  (id, name_ar, name_en, max_users, max_active_vehicles, max_storage_mb, trial_days, is_public, is_active, monthly_price_lyd, annual_price_lyd, features)
values
  ('draft_regression', 'اختبار المسودة', 'Draft regression', 1, 2, 10, 14, false, true, 10, 100, '[]'::jsonb);

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select 'draft_regression', code, true,
  case code when 'team_members' then 1 when 'active_vehicles' then 2 when 'storage_mb' then 10 else null end
from public.feature_catalog;

insert into public.organizations (id, name, slug, created_by)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Draft Regression Org',
  'draft-regression-org',
  '44444444-4444-4444-4444-444444444444'
);

insert into public.organization_members (organization_id, user_id, role, is_active, invited_by)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '44444444-4444-4444-4444-444444444444',
  'owner', true,
  '44444444-4444-4444-4444-444444444444'
);

insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'draft_regression', 'trialing', now() + interval '14 days');

select set_config(
  'app.regression_vehicle_id',
  public.save_vehicle_record(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    null,
    '{
      "purchasePaid":"",
      "shippingPaid":"",
      "notes":"Container deposit 300 dollars",
      "charges":[
        {"category":"inland_shipping","description":"Inland shipping","amount":900},
        {"category":"ocean_shipping","description":"Ocean shipping","amount":1500}
      ]
    }'::jsonb
  )::text,
  false
);

do $$
declare
  saved_vehicle_id uuid := current_setting('app.regression_vehicle_id')::uuid;
begin
  if not exists (select 1 from public.vehicles v where v.id = saved_vehicle_id) then
    raise exception 'Vehicle draft with empty numeric fields was not saved';
  end if;
  if exists (select 1 from public.payments p where p.vehicle_id = saved_vehicle_id) then
    raise exception 'Empty paid fields created a payment';
  end if;
  if (select coalesce(sum(c.amount), 0) from public.charges c where c.vehicle_id = saved_vehicle_id) <> 2400 then
    raise exception 'Vehicle draft charges were not preserved';
  end if;
end;
$$;

rollback;

select 'vehicle_draft_empty_numeric_regression_ok' as result;
