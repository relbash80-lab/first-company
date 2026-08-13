begin;

alter table public.plans
  add column if not exists monthly_price_lyd numeric(12,2) check (monthly_price_lyd is null or monthly_price_lyd >= 0),
  add column if not exists annual_price_lyd numeric(12,2) check (annual_price_lyd is null or annual_price_lyd >= 0),
  add column if not exists features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  add column if not exists display_order integer not null default 100;

update public.plans set
  monthly_price_lyd = 0,
  annual_price_lyd = 0,
  display_order = 0,
  features = '["تجربة النظام", "عزل بيانات الشركة", "الدعم الأساسي"]'::jsonb
where id = 'trial';

update public.plans set display_order = 10 where id = 'starter';
update public.plans set display_order = 20 where id = 'professional';
update public.plans set display_order = 30 where id = 'enterprise';

alter table public.subscriptions
  add column if not exists billing_cycle text check (billing_cycle is null or billing_cycle in ('monthly', 'annual')),
  add column if not exists grace_ends_at timestamptz;

create table public.subscription_sequences (
  sequence_year integer primary key,
  last_number bigint not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

create table public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  invoice_number text not null unique,
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  currency text not null default 'LYD' check (currency = 'LYD'),
  subtotal numeric(12,2) not null check (subtotal > 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) generated always as (subtotal - discount) stored,
  status text not null default 'issued' check (status in ('issued', 'paid', 'voided')),
  issue_date date not null default current_date,
  due_date date not null default (current_date + 7),
  period_start timestamptz,
  period_end timestamptz,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  check (discount <= subtotal),
  check (due_date >= issue_date)
);

create index subscription_invoices_org_date_idx
  on public.subscription_invoices(organization_id, issue_date desc);
create index subscription_invoices_status_idx
  on public.subscription_invoices(status, due_date);
create unique index subscription_invoices_one_open_request_idx
  on public.subscription_invoices(organization_id)
  where status = 'issued';

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  currency text not null default 'LYD' check (currency = 'LYD'),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('bank_transfer', 'cash', 'deposit', 'other')),
  reference text not null check (char_length(trim(reference)) >= 3),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  paid_at timestamptz not null,
  submitted_by uuid not null default auth.uid() references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.subscription_invoices(organization_id, id) on delete cascade
);

create unique index subscription_payments_one_pending_idx
  on public.subscription_payments(invoice_id)
  where status = 'pending';

create trigger subscription_invoices_updated_at before update on public.subscription_invoices
for each row execute function public.set_updated_at();
create trigger subscription_payments_updated_at before update on public.subscription_payments
for each row execute function public.set_updated_at();

create or replace function public.next_subscription_invoice_number(p_year integer default extract(year from current_date)::integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  insert into public.subscription_sequences(sequence_year, last_number)
  values (p_year, 1)
  on conflict (sequence_year) do update set
    last_number = public.subscription_sequences.last_number + 1,
    updated_at = now()
  returning last_number into next_number;

  return 'SUB-' || p_year::text || '-' || lpad(next_number::text, 6, '0');
end;
$$;

create or replace function public.request_subscription_invoice(
  p_organization_id uuid,
  p_plan_id text,
  p_billing_cycle text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan public.plans%rowtype;
  selected_price numeric(12,2);
  result_id uuid;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner']::public.organization_role[]
  ) then raise exception 'Only the organization owner can request a subscription invoice'; end if;
  if p_billing_cycle not in ('monthly', 'annual') then raise exception 'Invalid billing cycle'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  select * into selected_plan from public.plans
  where id = p_plan_id and is_active and is_public and id <> 'trial';
  if not found then raise exception 'Subscription plan not found'; end if;

  selected_price := case p_billing_cycle
    when 'monthly' then selected_plan.monthly_price_lyd
    else selected_plan.annual_price_lyd
  end;
  if coalesce(selected_price, 0) <= 0 then raise exception 'Plan price has not been approved yet'; end if;

  if exists (
    select 1 from public.subscription_invoices
    where organization_id = p_organization_id and status = 'issued'
  ) then raise exception 'An open subscription invoice already exists'; end if;

  insert into public.subscription_invoices (
    organization_id, plan_id, invoice_number, billing_cycle,
    subtotal, issue_date, due_date, created_by
  ) values (
    p_organization_id, p_plan_id,
    public.next_subscription_invoice_number(extract(year from current_date)::integer),
    p_billing_cycle, selected_price, current_date, current_date + 7, auth.uid()
  ) returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.submit_subscription_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_payment_method text,
  p_reference text,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.subscription_invoices%rowtype;
  result_id uuid;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner']::public.organization_role[]
  ) then raise exception 'Only the organization owner can submit subscription payment'; end if;
  if p_payment_method not in ('bank_transfer', 'cash', 'deposit', 'other') then raise exception 'Invalid payment method'; end if;
  if char_length(trim(coalesce(p_reference, ''))) < 3 then raise exception 'Payment reference is required'; end if;

  select * into target_invoice from public.subscription_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;
  if not found or target_invoice.status <> 'issued' then raise exception 'Open subscription invoice not found'; end if;
  if exists (select 1 from public.subscription_payments where invoice_id = p_invoice_id and status = 'pending') then
    raise exception 'A payment is already awaiting review';
  end if;

  insert into public.subscription_payments (
    organization_id, invoice_id, amount, payment_method, reference, paid_at, submitted_by
  ) values (
    p_organization_id, p_invoice_id, target_invoice.total,
    p_payment_method, trim(p_reference), coalesce(p_paid_at, now()), auth.uid()
  ) returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.review_subscription_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_payment public.subscription_payments%rowtype;
  target_invoice public.subscription_invoices%rowtype;
  current_subscription public.subscriptions%rowtype;
  activation_start timestamptz;
  activation_end timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'Platform administrator access required'; end if;

  select * into target_payment from public.subscription_payments
  where id = p_payment_id for update;
  if not found or target_payment.status <> 'pending' then raise exception 'Pending payment not found'; end if;

  select * into target_invoice from public.subscription_invoices
  where id = target_payment.invoice_id for update;
  if not found or target_invoice.status <> 'issued' then raise exception 'Open subscription invoice not found'; end if;

  if not p_approve then
    update public.subscription_payments set
      status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = nullif(trim(p_notes), '')
    where id = p_payment_id;
    return;
  end if;

  select * into current_subscription from public.subscriptions
  where organization_id = target_invoice.organization_id for update;

  activation_start := case
    when found and current_subscription.status = 'active' and current_subscription.current_period_end > now()
      then current_subscription.current_period_end
    else now()
  end;
  activation_end := case target_invoice.billing_cycle
    when 'monthly' then activation_start + interval '1 month'
    else activation_start + interval '1 year'
  end;

  update public.subscription_payments set
    status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = nullif(trim(p_notes), '')
  where id = p_payment_id;

  update public.subscription_invoices set
    status = 'paid', paid_at = now(), period_start = activation_start, period_end = activation_end
  where id = target_invoice.id;

  insert into public.subscriptions (
    organization_id, plan_id, status, provider, billing_cycle,
    current_period_start, current_period_end, trial_ends_at, canceled_at
  ) values (
    target_invoice.organization_id, target_invoice.plan_id, 'active', 'manual', target_invoice.billing_cycle,
    activation_start, activation_end, null, null
  ) on conflict (organization_id) do update set
    plan_id = excluded.plan_id,
    status = excluded.status,
    provider = excluded.provider,
    billing_cycle = excluded.billing_cycle,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    trial_ends_at = null,
    canceled_at = null,
    updated_at = now();
end;
$$;

create or replace function public.configure_plan_pricing(
  p_plan_id text,
  p_monthly_price_lyd numeric,
  p_annual_price_lyd numeric,
  p_features jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if p_plan_id = 'trial' then raise exception 'Trial pricing cannot be changed'; end if;
  if p_monthly_price_lyd is not null and p_monthly_price_lyd <= 0 then raise exception 'Monthly price must be positive'; end if;
  if p_annual_price_lyd is not null and p_annual_price_lyd <= 0 then raise exception 'Annual price must be positive'; end if;
  if p_features is not null and jsonb_typeof(p_features) <> 'array' then raise exception 'Features must be an array'; end if;

  update public.plans set
    monthly_price_lyd = p_monthly_price_lyd,
    annual_price_lyd = p_annual_price_lyd,
    features = coalesce(p_features, features),
    updated_at = now()
  where id = p_plan_id and is_active;
  if not found then raise exception 'Subscription plan not found'; end if;
end;
$$;

alter table public.subscription_sequences enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.subscription_payments enable row level security;

create policy subscription_invoices_select_member on public.subscription_invoices
for select to authenticated using (
  public.is_organization_member(organization_id) or public.is_platform_admin()
);

create policy subscription_payments_select_member on public.subscription_payments
for select to authenticated using (
  public.is_organization_member(organization_id) or public.is_platform_admin()
);

revoke all on public.subscription_sequences from authenticated;
grant select on public.subscription_invoices, public.subscription_payments to authenticated;

revoke all on function public.next_subscription_invoice_number(integer) from public, authenticated;
revoke all on function public.request_subscription_invoice(uuid, text, text) from public;
revoke all on function public.submit_subscription_payment(uuid, uuid, text, text, timestamptz) from public;
revoke all on function public.review_subscription_payment(uuid, boolean, text) from public;
revoke all on function public.configure_plan_pricing(text, numeric, numeric, jsonb) from public;

grant execute on function public.request_subscription_invoice(uuid, text, text) to authenticated;
grant execute on function public.submit_subscription_payment(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.review_subscription_payment(uuid, boolean, text) to authenticated;
grant execute on function public.configure_plan_pricing(text, numeric, numeric, jsonb) to authenticated;

commit;
