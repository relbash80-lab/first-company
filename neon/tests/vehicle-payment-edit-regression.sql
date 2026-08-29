\set ON_ERROR_STOP on

begin;

create or replace function app_auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('app.test_uid', true), '')::uuid $$;

select set_config('app.test_uid', '55555555-5555-5555-5555-555555555555', false);

insert into app_auth.users (id, email)
values ('55555555-5555-5555-5555-555555555555', 'payment-edit-regression@test.local');

insert into public.profiles (id, display_name)
values ('55555555-5555-5555-5555-555555555555', 'Payment edit regression');

insert into public.plans
  (id, name_ar, name_en, max_users, max_active_vehicles, max_storage_mb, trial_days, is_public, is_active, monthly_price_lyd, annual_price_lyd, features)
values
  ('payment_edit_regression', 'اختبار تعديل المدفوع', 'Payment edit regression', 1, 2, 10, 14, false, true, 10, 100, '[]'::jsonb);

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select 'payment_edit_regression', code, true,
  case code when 'team_members' then 1 when 'active_vehicles' then 2 when 'storage_mb' then 10 else null end
from public.feature_catalog;

insert into public.organizations (id, name, slug, created_by)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Payment Edit Regression Org',
  'payment-edit-regression-org',
  '55555555-5555-5555-5555-555555555555'
);

insert into public.organization_members (organization_id, user_id, role, is_active, invited_by)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '55555555-5555-5555-5555-555555555555',
  'owner', true,
  '55555555-5555-5555-5555-555555555555'
);

insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'payment_edit_regression', 'trialing', now() + interval '14 days');

select set_config(
  'app.payment_edit_vehicle_id',
  public.save_vehicle_record(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    null,
    '{"purchasePaid":2920,"shippingPaid":500,"charges":[]}'::jsonb
  )::text,
  false
);

select public.save_vehicle_record(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  current_setting('app.payment_edit_vehicle_id')::uuid,
  '{"purchasePaid":2500,"shippingPaid":null,"charges":[]}'::jsonb
);

do $$
declare
  saved_vehicle_id uuid := current_setting('app.payment_edit_vehicle_id')::uuid;
begin
  if (
    select coalesce(sum(amount), 0)
    from public.payments
    where vehicle_id = saved_vehicle_id and type = 'purchase' and status = 'posted'
  ) <> 2500 then
    raise exception 'Purchase paid total was not reduced to 2500';
  end if;

  if exists (
    select 1 from public.payments
    where vehicle_id = saved_vehicle_id and type = 'shipping' and status = 'posted'
  ) then
    raise exception 'Shipping paid total was not cleared';
  end if;

  if (
    select count(*) from public.payments
    where vehicle_id = saved_vehicle_id and status = 'voided'
  ) <> 2 then
    raise exception 'Original opening entries were not preserved as voided ledger rows';
  end if;
end;
$$;

select public.save_vehicle_record(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  current_setting('app.payment_edit_vehicle_id')::uuid,
  '{"purchasePaid":3100,"shippingPaid":700,"charges":[]}'::jsonb
);

do $$
declare
  saved_vehicle_id uuid := current_setting('app.payment_edit_vehicle_id')::uuid;
begin
  if (
    select coalesce(sum(amount), 0)
    from public.payments
    where vehicle_id = saved_vehicle_id and type = 'purchase' and status = 'posted'
  ) <> 3100 then
    raise exception 'Purchase paid total was not increased to 3100';
  end if;

  if (
    select coalesce(sum(amount), 0)
    from public.payments
    where vehicle_id = saved_vehicle_id and type = 'shipping' and status = 'posted'
  ) <> 700 then
    raise exception 'Shipping paid total was not increased to 700';
  end if;
end;
$$;

insert into public.payments (
  organization_id, vehicle_id, type, amount, reference, notes, created_by
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  current_setting('app.payment_edit_vehicle_id')::uuid,
  'purchase', 400, 'manual-receipt', 'Immutable posted receipt',
  '55555555-5555-5555-5555-555555555555'
);

do $$
begin
  perform public.save_vehicle_record(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    current_setting('app.payment_edit_vehicle_id')::uuid,
    '{"purchasePaid":300,"shippingPaid":700,"charges":[]}'::jsonb
  );
  raise exception 'Expected PAYMENT_TOTAL_BELOW_POSTED was not raised';
exception
  when others then
    if sqlerrm not like 'PAYMENT_TOTAL_BELOW_POSTED:purchase:400%' then
      raise;
    end if;
end;
$$;

rollback;

select 'vehicle_payment_edit_regression_ok' as result;
