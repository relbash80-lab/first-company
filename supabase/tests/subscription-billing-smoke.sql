-- Run in a disposable/local Supabase database after all migrations.
-- Structural tests for the isolated LYD SaaS subscription billing module.

begin;

select plan(15);

select has_table('public', 'subscription_sequences', 'subscription sequence table exists');
select has_table('public', 'subscription_invoices', 'subscription invoices table exists');
select has_table('public', 'subscription_payments', 'subscription payments table exists');

select has_column('public', 'plans', 'monthly_price_lyd', 'plans have monthly LYD pricing');
select has_column('public', 'plans', 'annual_price_lyd', 'plans have annual LYD pricing');
select has_column('public', 'plans', 'features', 'plans have feature lists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.subscription_invoices'::regclass),
  'subscription invoices RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.subscription_payments'::regclass),
  'subscription payments RLS is enabled'
);

select has_function(
  'public', 'request_subscription_invoice', array['uuid','text','text'],
  'subscription invoice request function exists'
);
select has_function(
  'public', 'submit_subscription_payment', array['uuid','uuid','text','text','timestamptz'],
  'subscription payment submission function exists'
);
select has_function(
  'public', 'review_subscription_payment', array['uuid','boolean','text'],
  'subscription payment review function exists'
);
select has_function(
  'public', 'configure_plan_pricing', array['text','numeric','numeric','jsonb'],
  'plan pricing configuration function exists'
);

select ok(
  exists(
    select 1 from pg_constraint
    where conrelid = 'public.subscription_invoices'::regclass
      and pg_get_constraintdef(oid) like '%currency =%LYD%'
  ),
  'subscription invoices are restricted to LYD'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid = 'public.subscription_payments'::regclass
      and pg_get_constraintdef(oid) like '%currency =%LYD%'
  ),
  'subscription payments are restricted to LYD'
);
select ok(
  (select monthly_price_lyd = 0 and annual_price_lyd = 0 from public.plans where id = 'trial'),
  'trial plan remains free'
);

select * from finish();
rollback;
