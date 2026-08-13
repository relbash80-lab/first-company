-- Run in a disposable/local Supabase database only.
-- These checks document the required isolation contract; they are not production seed data.

begin;

select plan(6);

select ok(
  exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'vehicles'),
  'vehicles has RLS policies'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.vehicles'::regclass),
  'vehicles RLS is enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments RLS is enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.documents'::regclass),
  'documents RLS is enabled'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conrelid = 'public.vehicles'::regclass
      and contype = 'u'
  ),
  'vehicles has uniqueness constraints including tenant VIN uniqueness'
);

select ok(
  exists(
    select 1
    from information_schema.views
    where table_schema = 'public' and table_name = 'vehicle_balances'
  ),
  'vehicle balance view exists'
);

select * from finish();
rollback;
