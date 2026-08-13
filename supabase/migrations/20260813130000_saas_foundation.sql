begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'owner',
  'manager',
  'buyer',
  'shipping_officer',
  'accountant',
  'viewer'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'suspended',
  'canceled'
);

create type public.vehicle_status as enum (
  'purchased',
  'purchase_paid',
  'inland_transit',
  'at_port',
  'loaded',
  'in_transit',
  'arrived',
  'released'
);

create type public.charge_category as enum (
  'purchase',
  'commission',
  'auction_fee',
  'other_purchase',
  'inland_shipping',
  'ocean_shipping',
  'container_shared',
  'customs',
  'other_shipping'
);

create type public.payment_type as enum ('purchase', 'shipping');
create type public.payment_status as enum ('posted', 'voided');
create type public.allocation_method as enum ('equal', 'fixed', 'percentage');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Tripoli',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'viewer',
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members(user_id, organization_id)
  where is_active;

create table public.plans (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name_ar text not null,
  name_en text not null,
  max_users integer check (max_users is null or max_users > 0),
  max_active_vehicles integer check (max_active_vehicles is null or max_active_vehicles > 0),
  max_storage_mb integer check (max_storage_mb is null or max_storage_mb > 0),
  trial_days integer not null default 0 check (trial_days >= 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status public.subscription_status not null default 'trialing',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create unique index subscriptions_provider_subscription_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table public.usage_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  active_vehicles integer not null default 0 check (active_vehicles >= 0),
  member_count integer not null default 0 check (member_count >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, period_start)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  phone text,
  email text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create index clients_org_name_idx on public.clients(organization_id, name);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid,
  vin text not null,
  year smallint check (year is null or year between 1900 and 2200),
  make text,
  model text,
  trim text,
  auction text check (auction is null or auction in ('Copart', 'IAAI', 'Other')),
  lot_stock text,
  buying_location text,
  buying_date date,
  purchase_wire_date date,
  status public.vehicle_status not null default 'purchased',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, vin),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id)
);

create index vehicles_org_status_idx on public.vehicles(organization_id, status);
create index vehicles_org_buying_date_idx on public.vehicles(organization_id, buying_date desc);

create table public.containers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  shipping_line text,
  shipping_port text,
  destination text,
  transit_arrival_date date,
  shipping_wire_date date,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, number)
);

create table public.container_vehicles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  container_id uuid not null,
  vehicle_id uuid not null,
  loaded_at timestamptz,
  unloaded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (container_id, vehicle_id),
  foreign key (organization_id, container_id)
    references public.containers(organization_id, id) on delete cascade,
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade
);

create index container_vehicles_org_vehicle_idx
  on public.container_vehicles(organization_id, vehicle_id);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  container_id uuid,
  category public.charge_category not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  charge_date date not null default current_date,
  source text not null default 'manual',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade,
  foreign key (organization_id, container_id)
    references public.containers(organization_id, id)
);

create index charges_org_vehicle_idx on public.charges(organization_id, vehicle_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  type public.payment_type not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  payment_date date not null default current_date,
  reference text,
  notes text,
  status public.payment_status not null default 'posted',
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete restrict,
  check (
    (status = 'posted' and voided_at is null and voided_by is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and char_length(trim(void_reason)) >= 3)
  )
);

create index payments_org_vehicle_idx on public.payments(organization_id, vehicle_id, payment_date desc);

create table public.container_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  container_id uuid not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  allocation_method public.allocation_method not null default 'equal',
  cost_date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, container_id)
    references public.containers(organization_id, id) on delete cascade
);

create table public.cost_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  container_cost_id uuid not null,
  vehicle_id uuid not null,
  amount numeric(14,2) not null check (amount >= 0),
  percentage numeric(7,4) check (percentage is null or percentage between 0 and 100),
  created_at timestamptz not null default now(),
  unique (container_cost_id, vehicle_id),
  foreign key (organization_id, container_cost_id)
    references public.container_costs(organization_id, id) on delete cascade,
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade
);

create table public.vehicle_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  from_status public.vehicle_status,
  to_status public.vehicle_status not null,
  reason text,
  changed_by uuid not null default auth.uid() references auth.users(id),
  changed_at timestamptz not null default now(),
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade
);

create index vehicle_status_history_vehicle_idx
  on public.vehicle_status_history(organization_id, vehicle_id, changed_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid,
  container_id uuid,
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade,
  foreign key (organization_id, container_id)
    references public.containers(organization_id, id) on delete cascade,
  check (vehicle_id is not null or container_id is not null),
  check (storage_path like organization_id::text || '/%')
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_table text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx
  on public.audit_logs(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger plans_updated_at before update on public.plans
for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger containers_updated_at before update on public.containers
for each row execute function public.set_updated_at();
create trigger charges_updated_at before update on public.charges
for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger container_costs_updated_at before update on public.container_costs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.is_active
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.is_active
      and om.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.has_organization_role(uuid, public.organization_role[]) from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_role[]) to authenticated;

create or replace function public.create_organization(
  organization_name text,
  organization_slug text,
  currency_code text default 'USD'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(organization_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;

  insert into public.organizations (name, slug, default_currency, created_by)
  values (trim(organization_name), lower(trim(organization_slug)), upper(currency_code), auth.uid())
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (new_organization_id, auth.uid(), 'owner', auth.uid());

  insert into public.subscriptions (
    organization_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  )
  select
    new_organization_id,
    p.id,
    'trialing',
    now() + make_interval(days => p.trial_days),
    now(),
    now() + make_interval(days => greatest(p.trial_days, 1))
  from public.plans p
  where p.id = 'trial';

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;

create or replace function public.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  target_org uuid;
  target_id text;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_org := coalesce((new_row ->> 'organization_id')::uuid, (old_row ->> 'organization_id')::uuid);
  target_id := coalesce(new_row ->> 'id', old_row ->> 'id');

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_table, entity_id, old_data, new_data
  ) values (
    target_org, auth.uid(), lower(tg_op), tg_table_name, target_id, old_row, new_row
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger clients_audit after insert or update or delete on public.clients
for each row execute function public.capture_audit_log();
create trigger vehicles_audit after insert or update or delete on public.vehicles
for each row execute function public.capture_audit_log();
create trigger containers_audit after insert or update or delete on public.containers
for each row execute function public.capture_audit_log();
create trigger charges_audit after insert or update or delete on public.charges
for each row execute function public.capture_audit_log();
create trigger payments_audit after insert or update or delete on public.payments
for each row execute function public.capture_audit_log();
create trigger container_costs_audit after insert or update or delete on public.container_costs
for each row execute function public.capture_audit_log();

create or replace function public.capture_vehicle_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.vehicle_status_history (
      organization_id, vehicle_id, from_status, to_status, changed_by
    ) values (
      new.organization_id, new.id, old.status, new.status, auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger vehicles_status_history
after update of status on public.vehicles
for each row execute function public.capture_vehicle_status_history();

create view public.vehicle_financial_summary
with (security_invoker = true)
as
select
  v.organization_id,
  v.id as vehicle_id,
  v.vin,
  coalesce(sum(c.amount) filter (
    where c.category in ('purchase', 'commission', 'auction_fee', 'other_purchase')
  ), 0)::numeric(14,2) as purchase_due,
  coalesce(sum(c.amount) filter (
    where c.category in ('inland_shipping', 'ocean_shipping', 'container_shared', 'customs', 'other_shipping')
  ), 0)::numeric(14,2) as shipping_due,
  coalesce((
    select sum(p.amount) from public.payments p
    where p.organization_id = v.organization_id
      and p.vehicle_id = v.id
      and p.type = 'purchase'
      and p.status = 'posted'
  ), 0)::numeric(14,2) as purchase_paid,
  coalesce((
    select sum(p.amount) from public.payments p
    where p.organization_id = v.organization_id
      and p.vehicle_id = v.id
      and p.type = 'shipping'
      and p.status = 'posted'
  ), 0)::numeric(14,2) as shipping_paid
from public.vehicles v
left join public.charges c
  on c.organization_id = v.organization_id and c.vehicle_id = v.id
group by v.organization_id, v.id, v.vin;

create view public.vehicle_balances
with (security_invoker = true)
as
select
  s.*,
  (s.purchase_due - s.purchase_paid)::numeric(14,2) as purchase_balance,
  (s.shipping_due - s.shipping_paid)::numeric(14,2) as shipping_balance,
  (s.purchase_due + s.shipping_due - s.purchase_paid - s.shipping_paid)::numeric(14,2) as total_balance
from public.vehicle_financial_summary s;

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.billing_events enable row level security;
alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
alter table public.containers enable row level security;
alter table public.container_vehicles enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;
alter table public.container_costs enable row level security;
alter table public.cost_allocations enable row level security;
alter table public.vehicle_status_history enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy platform_admins_select_self on public.platform_admins
for select to authenticated using (user_id = (select auth.uid()));

create policy organizations_select_member on public.organizations
for select to authenticated using (public.is_organization_member(id) or public.is_platform_admin());
create policy organizations_update_owner on public.organizations
for update to authenticated
using (public.has_organization_role(id, array['owner']::public.organization_role[]))
with check (public.has_organization_role(id, array['owner']::public.organization_role[]));

create policy members_select_same_org on public.organization_members
for select to authenticated using (
  public.is_organization_member(organization_id) or public.is_platform_admin()
);
create policy members_insert_owner on public.organization_members
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner']::public.organization_role[])
);
create policy members_update_owner on public.organization_members
for update to authenticated
using (public.has_organization_role(organization_id, array['owner']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner']::public.organization_role[]));
create policy members_delete_owner on public.organization_members
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner']::public.organization_role[])
  and user_id <> (select auth.uid())
);

create policy plans_read_active on public.plans
for select to authenticated using (is_active or public.is_platform_admin());

create policy subscriptions_select_member on public.subscriptions
for select to authenticated using (
  public.is_organization_member(organization_id) or public.is_platform_admin()
);
create policy usage_select_member on public.usage_counters
for select to authenticated using (
  public.is_organization_member(organization_id) or public.is_platform_admin()
);
create policy billing_events_admin_only on public.billing_events
for select to authenticated using (public.is_platform_admin());

create policy clients_select_member on public.clients
for select to authenticated using (public.is_organization_member(organization_id));
create policy clients_insert_operations on public.clients
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','buyer']::public.organization_role[])
);
create policy clients_update_operations on public.clients
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','buyer']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','buyer']::public.organization_role[]));
create policy clients_delete_manager on public.clients
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy vehicles_select_member on public.vehicles
for select to authenticated using (public.is_organization_member(organization_id));
create policy vehicles_insert_operations on public.vehicles
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','buyer']::public.organization_role[])
);
create policy vehicles_update_operations on public.vehicles
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','buyer','shipping_officer']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','buyer','shipping_officer']::public.organization_role[]));
create policy vehicles_delete_manager on public.vehicles
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy containers_select_member on public.containers
for select to authenticated using (public.is_organization_member(organization_id));
create policy containers_insert_shipping on public.containers
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[])
);
create policy containers_update_shipping on public.containers
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[]));
create policy containers_delete_manager on public.containers
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy container_vehicles_select_member on public.container_vehicles
for select to authenticated using (public.is_organization_member(organization_id));
create policy container_vehicles_insert_shipping on public.container_vehicles
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[])
);
create policy container_vehicles_update_shipping on public.container_vehicles
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[]));
create policy container_vehicles_delete_shipping on public.container_vehicles
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager','shipping_officer']::public.organization_role[])
);

create policy charges_select_member on public.charges
for select to authenticated using (public.is_organization_member(organization_id));
create policy charges_insert_finance on public.charges
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','buyer','shipping_officer','accountant']::public.organization_role[])
);
create policy charges_update_finance on public.charges
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[]));
create policy charges_delete_manager on public.charges
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy payments_select_member on public.payments
for select to authenticated using (public.is_organization_member(organization_id));
create policy payments_insert_accounting on public.payments
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[])
);
create policy payments_update_accounting on public.payments
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[]));

create policy container_costs_select_member on public.container_costs
for select to authenticated using (public.is_organization_member(organization_id));
create policy container_costs_insert_shipping on public.container_costs
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','shipping_officer','accountant']::public.organization_role[])
);
create policy container_costs_update_shipping on public.container_costs
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','shipping_officer','accountant']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','shipping_officer','accountant']::public.organization_role[]));
create policy container_costs_delete_manager on public.container_costs
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy allocations_select_member on public.cost_allocations
for select to authenticated using (public.is_organization_member(organization_id));
create policy allocations_write_finance on public.cost_allocations
for all to authenticated
using (public.has_organization_role(organization_id, array['owner','manager','shipping_officer','accountant']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager','shipping_officer','accountant']::public.organization_role[]));

create policy status_history_select_member on public.vehicle_status_history
for select to authenticated using (public.is_organization_member(organization_id));

create policy documents_select_member on public.documents
for select to authenticated using (public.is_organization_member(organization_id));
create policy documents_insert_operations on public.documents
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager','buyer','shipping_officer','accountant']::public.organization_role[])
);
create policy documents_delete_manager on public.documents
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);

create policy audit_logs_select_management on public.audit_logs
for select to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
  or public.is_platform_admin()
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit;

create policy documents_storage_select on storage.objects
for select to authenticated using (
  bucket_id = 'documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);

create policy documents_storage_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'documents'
  and public.has_organization_role(
    (storage.foldername(name))[1]::uuid,
    array['owner','manager','buyer','shipping_officer','accountant']::public.organization_role[]
  )
);

create policy documents_storage_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'documents'
  and public.has_organization_role(
    (storage.foldername(name))[1]::uuid,
    array['owner','manager']::public.organization_role[]
  )
);

grant usage on schema public to authenticated;
grant select on public.plans to authenticated;
grant select on public.vehicle_financial_summary, public.vehicle_balances to authenticated;
grant select, insert, update, delete on public.organizations, public.organization_members to authenticated;
grant select on public.subscriptions, public.usage_counters to authenticated;
grant select, insert, update, delete on
  public.clients,
  public.vehicles,
  public.containers,
  public.container_vehicles,
  public.charges,
  public.payments,
  public.container_costs,
  public.cost_allocations,
  public.documents
to authenticated;
grant select on public.vehicle_status_history, public.audit_logs to authenticated;

alter publication supabase_realtime add table public.vehicles;
alter publication supabase_realtime add table public.containers;
alter publication supabase_realtime add table public.payments;

commit;
