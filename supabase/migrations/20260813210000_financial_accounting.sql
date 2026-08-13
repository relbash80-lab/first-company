begin;

create type public.invoice_status as enum (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'overdue',
  'voided'
);

create type public.receipt_status as enum ('posted', 'voided');
create type public.credit_note_status as enum ('draft', 'issued', 'voided');
create type public.financial_document_type as enum ('invoice', 'receipt', 'credit_note');
create type public.receipt_method as enum ('cash', 'bank_transfer', 'check', 'other');

create table public.financial_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  legal_name text,
  address text,
  phone text,
  email text,
  invoice_prefix text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9-]{2,12}$'),
  receipt_prefix text not null default 'RCT' check (receipt_prefix ~ '^[A-Z0-9-]{2,12}$'),
  credit_note_prefix text not null default 'CRN' check (credit_note_prefix ~ '^[A-Z0-9-]{2,12}$'),
  operational_currencies text[] not null default array['USD','LYD']::text[]
    check (
      cardinality(operational_currencies) > 0
      and operational_currencies <@ array['USD','LYD']::text[]
    ),
  default_due_days integer not null default 0 check (default_due_days between 0 and 365),
  payment_instructions text,
  invoice_footer text,
  logo_storage_path text,
  tax_enabled boolean not null default false,
  tax_label text,
  tax_rate numeric(7,4) not null default 0 check (tax_rate between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.financial_settings (organization_id, legal_name)
select id, name from public.organizations
on conflict (organization_id) do nothing;

create table public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type public.financial_document_type not null,
  fiscal_year smallint not null check (fiscal_year between 2000 and 2200),
  next_value bigint not null default 1 check (next_value > 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, document_type, fiscal_year)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  invoice_number text,
  status public.invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date not null default current_date,
  currency text not null default 'USD' check (currency in ('USD', 'LYD')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  customer_notes text,
  internal_notes text,
  issued_at timestamptz,
  issued_by uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  pdf_storage_path text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, invoice_number),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  check (due_date >= issue_date),
  check (discount_total <= subtotal),
  check (grand_total = subtotal - discount_total + tax_total),
  check (
    (status = 'draft' and invoice_number is null and issued_at is null and issued_by is null and voided_at is null)
    or
    (status in ('issued', 'partially_paid', 'paid', 'overdue') and invoice_number is not null and issued_at is not null and issued_by is not null and voided_at is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and char_length(trim(void_reason)) >= 3)
  )
);

create index invoices_org_client_idx
  on public.invoices(organization_id, client_id, issue_date desc);
create index invoices_org_status_due_idx
  on public.invoices(organization_id, status, due_date);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  vehicle_id uuid,
  charge_id uuid,
  category text not null,
  description text not null check (char_length(trim(description)) >= 2),
  vehicle_label text,
  vin_snapshot text,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.invoices(organization_id, id) on delete cascade,
  foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete restrict,
  foreign key (organization_id, charge_id)
    references public.charges(organization_id, id) on delete restrict
);

create index invoice_items_org_invoice_idx
  on public.invoice_items(organization_id, invoice_id, sort_order);
create unique index invoice_items_active_charge_uidx
  on public.invoice_items(organization_id, charge_id)
  where charge_id is not null and is_active;

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  receipt_number text not null,
  receipt_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('USD', 'LYD')),
  payment_method public.receipt_method not null,
  reference text,
  notes text,
  attachment_storage_path text,
  status public.receipt_status not null default 'posted',
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, receipt_number),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  check (
    (status = 'posted' and voided_at is null and voided_by is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and char_length(trim(void_reason)) >= 3)
  )
);

create index receipts_org_client_idx
  on public.receipts(organization_id, client_id, receipt_date desc);

create table public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null,
  invoice_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  allocated_by uuid not null default auth.uid() references auth.users(id),
  allocated_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id),
  reversal_reason text,
  unique (organization_id, id),
  foreign key (organization_id, receipt_id)
    references public.receipts(organization_id, id) on delete restrict,
  foreign key (organization_id, invoice_id)
    references public.invoices(organization_id, id) on delete restrict,
  check (
    (reversed_at is null and reversed_by is null and reversal_reason is null)
    or
    (reversed_at is not null and reversed_by is not null and char_length(trim(reversal_reason)) >= 3)
  )
);

create index receipt_allocations_org_receipt_idx
  on public.receipt_allocations(organization_id, receipt_id);
create index receipt_allocations_org_invoice_idx
  on public.receipt_allocations(organization_id, invoice_id);
create unique index receipt_allocations_active_pair_uidx
  on public.receipt_allocations(receipt_id, invoice_id)
  where reversed_at is null;

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  invoice_id uuid not null,
  credit_note_number text,
  status public.credit_note_status not null default 'draft',
  issue_date date not null default current_date,
  currency text not null default 'USD' check (currency in ('USD', 'LYD')),
  total numeric(14,2) not null default 0 check (total >= 0),
  reason text not null check (char_length(trim(reason)) >= 3),
  issued_at timestamptz,
  issued_by uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, credit_note_number),
  foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete restrict,
  foreign key (organization_id, invoice_id)
    references public.invoices(organization_id, id) on delete restrict,
  check (
    (status = 'draft' and credit_note_number is null and issued_at is null and issued_by is null and voided_at is null)
    or
    (status = 'issued' and credit_note_number is not null and issued_at is not null and issued_by is not null and voided_at is null)
    or
    (status = 'voided' and voided_at is not null and voided_by is not null and char_length(trim(void_reason)) >= 3)
  )
);

create index credit_notes_org_invoice_idx
  on public.credit_notes(organization_id, invoice_id, status);

create table public.credit_note_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  credit_note_id uuid not null,
  description text not null check (char_length(trim(description)) >= 2),
  amount numeric(14,2) not null check (amount > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, credit_note_id)
    references public.credit_notes(organization_id, id) on delete cascade
);

create index credit_note_items_org_note_idx
  on public.credit_note_items(organization_id, credit_note_id, sort_order);

create trigger financial_settings_updated_at before update on public.financial_settings
for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();
create trigger receipts_updated_at before update on public.receipts
for each row execute function public.set_updated_at();
create trigger credit_notes_updated_at before update on public.credit_notes
for each row execute function public.set_updated_at();

create trigger invoices_audit after insert or update or delete on public.invoices
for each row execute function public.capture_audit_log();
create trigger invoice_items_audit after insert or update or delete on public.invoice_items
for each row execute function public.capture_audit_log();
create trigger receipts_audit after insert or update or delete on public.receipts
for each row execute function public.capture_audit_log();
create trigger receipt_allocations_audit after insert or update or delete on public.receipt_allocations
for each row execute function public.capture_audit_log();
create trigger credit_notes_audit after insert or update or delete on public.credit_notes
for each row execute function public.capture_audit_log();
create trigger credit_note_items_audit after insert or update or delete on public.credit_note_items
for each row execute function public.capture_audit_log();

create or replace function public.create_financial_settings_for_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_settings (organization_id, legal_name)
  values (new.id, new.name)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_financial_settings
after insert on public.organizations
for each row execute function public.create_financial_settings_for_org();

create or replace function public.next_financial_document_number(
  p_organization_id uuid,
  p_document_type public.financial_document_type,
  p_document_date date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_number bigint;
  target_fiscal_year smallint := extract(year from p_document_date)::smallint;
  prefix text;
begin
  insert into public.document_sequences (
    organization_id, document_type, fiscal_year, next_value
  ) values (
    p_organization_id, p_document_type, target_fiscal_year, 2
  )
  on conflict (organization_id, document_type, fiscal_year)
  do update set
    next_value = public.document_sequences.next_value + 1,
    updated_at = now()
  returning next_value - 1 into assigned_number;

  select case p_document_type
    when 'invoice' then fs.invoice_prefix
    when 'receipt' then fs.receipt_prefix
    when 'credit_note' then fs.credit_note_prefix
  end into prefix
  from public.financial_settings fs
  where fs.organization_id = p_organization_id;

  prefix := coalesce(prefix, case p_document_type
    when 'invoice' then 'INV'
    when 'receipt' then 'RCT'
    when 'credit_note' then 'CRN'
  end);

  return prefix || '-' || target_fiscal_year::text || '-' || lpad(assigned_number::text, 6, '0');
end;
$$;

create or replace function public.refresh_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.invoices%rowtype;
  allocated_total numeric(14,2);
  credited_total numeric(14,2);
  remaining_total numeric(14,2);
begin
  select * into target_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found or target_invoice.status in ('draft', 'voided') then
    return;
  end if;

  select coalesce(sum(ra.amount), 0)::numeric(14,2)
  into allocated_total
  from public.receipt_allocations ra
  join public.receipts r
    on r.organization_id = ra.organization_id and r.id = ra.receipt_id
  where ra.invoice_id = p_invoice_id
    and ra.reversed_at is null
    and r.status = 'posted';

  select coalesce(sum(cn.total), 0)::numeric(14,2)
  into credited_total
  from public.credit_notes cn
  where cn.invoice_id = p_invoice_id and cn.status = 'issued';

  remaining_total := target_invoice.grand_total - allocated_total - credited_total;

  update public.invoices
  set status = case
    when remaining_total <= 0 then 'paid'::public.invoice_status
    when allocated_total + credited_total > 0 then 'partially_paid'::public.invoice_status
    when due_date < current_date then 'overdue'::public.invoice_status
    else 'issued'::public.invoice_status
  end
  where id = p_invoice_id;
end;
$$;

create or replace function public.create_invoice_draft(
  p_organization_id uuid,
  p_client_id uuid,
  p_charge_ids uuid[],
  p_currency text,
  p_issue_date date default current_date,
  p_due_date date default null,
  p_customer_notes text default null,
  p_internal_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_invoice_id uuid;
  selected_count integer;
  expected_count integer;
  currency_code text := upper(trim(coalesce(p_currency, '')));
  due_days integer;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then
    raise exception 'Not authorized to create invoices';
  end if;

  expected_count := coalesce(cardinality(p_charge_ids), 0);
  if expected_count = 0 then
    raise exception 'At least one charge is required';
  end if;

  if expected_count <> (select count(distinct item) from unnest(p_charge_ids) item) then
    raise exception 'Duplicate charge IDs are not allowed';
  end if;

  if currency_code not in ('USD', 'LYD') then
    raise exception 'Currency must be USD or LYD';
  end if;

  if not exists (
    select 1 from public.clients
    where organization_id = p_organization_id and id = p_client_id
  ) then
    raise exception 'Client not found';
  end if;

  select count(*) into selected_count
  from public.charges c
  join public.vehicles v
    on v.organization_id = c.organization_id and v.id = c.vehicle_id
  where c.organization_id = p_organization_id
    and c.id = any(p_charge_ids)
    and c.currency = currency_code
    and v.client_id = p_client_id
    and not exists (
      select 1 from public.invoice_items ii
      where ii.organization_id = c.organization_id
        and ii.charge_id = c.id
        and ii.is_active
    );

  if selected_count <> expected_count then
    raise exception 'One or more charges are invalid, already invoiced, or belong to another client';
  end if;

  select coalesce(fs.default_due_days, 0)
  into due_days
  from public.organizations o
  left join public.financial_settings fs on fs.organization_id = o.id
  where o.id = p_organization_id;

  insert into public.invoices (
    organization_id, client_id, issue_date, due_date, currency,
    customer_notes, internal_notes
  ) values (
    p_organization_id,
    p_client_id,
    coalesce(p_issue_date, current_date),
    coalesce(p_due_date, coalesce(p_issue_date, current_date) + due_days),
    currency_code,
    nullif(trim(p_customer_notes), ''),
    nullif(trim(p_internal_notes), '')
  ) returning id into result_invoice_id;

  insert into public.invoice_items (
    organization_id, invoice_id, vehicle_id, charge_id, category,
    description, vehicle_label, vin_snapshot, quantity, unit_price, sort_order
  )
  select
    c.organization_id,
    result_invoice_id,
    c.vehicle_id,
    c.id,
    c.category::text,
    coalesce(nullif(trim(c.description), ''), c.category::text),
    concat_ws(' ', v.year, v.make, v.model, v.trim),
    v.vin,
    1,
    c.amount,
    row_number() over (order by v.created_at, c.created_at)::integer
  from public.charges c
  join public.vehicles v
    on v.organization_id = c.organization_id and v.id = c.vehicle_id
  where c.organization_id = p_organization_id and c.id = any(p_charge_ids);

  return result_invoice_id;
end;
$$;

create or replace function public.issue_invoice(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_discount_total numeric default 0,
  p_tax_total numeric default 0
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.invoices%rowtype;
  calculated_subtotal numeric(14,2);
  calculated_total numeric(14,2);
  assigned_number text;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then
    raise exception 'Not authorized to issue invoices';
  end if;

  select * into target_invoice
  from public.invoices
  where organization_id = p_organization_id and id = p_invoice_id
  for update;

  if not found then raise exception 'Invoice not found'; end if;
  if target_invoice.status <> 'draft' then raise exception 'Only draft invoices can be issued'; end if;
  if coalesce(p_discount_total, 0) < 0 or coalesce(p_tax_total, 0) < 0 then
    raise exception 'Discount and tax cannot be negative';
  end if;

  select coalesce(sum(line_total), 0)::numeric(14,2)
  into calculated_subtotal
  from public.invoice_items
  where organization_id = p_organization_id
    and invoice_id = p_invoice_id
    and is_active;

  if calculated_subtotal <= 0 then raise exception 'Invoice must contain billable items'; end if;
  if coalesce(p_discount_total, 0) > calculated_subtotal then
    raise exception 'Discount cannot exceed subtotal';
  end if;

  calculated_total := calculated_subtotal - coalesce(p_discount_total, 0) + coalesce(p_tax_total, 0);
  assigned_number := public.next_financial_document_number(
    p_organization_id, 'invoice', target_invoice.issue_date
  );

  update public.invoices
  set
    invoice_number = assigned_number,
    subtotal = calculated_subtotal,
    discount_total = coalesce(p_discount_total, 0),
    tax_total = coalesce(p_tax_total, 0),
    grand_total = calculated_total,
    status = case
      when due_date < current_date then 'overdue'::public.invoice_status
      else 'issued'::public.invoice_status
    end,
    issued_at = now(),
    issued_by = auth.uid()
  where id = p_invoice_id;

  return assigned_number;
end;
$$;

create or replace function public.void_invoice(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.invoices%rowtype;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager']::public.organization_role[]
  ) then
    raise exception 'Only an owner or manager can void an invoice';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A void reason is required'; end if;

  select * into target_invoice from public.invoices
  where organization_id = p_organization_id and id = p_invoice_id
  for update;

  if not found then raise exception 'Invoice not found'; end if;
  if target_invoice.status = 'voided' then raise exception 'Invoice is already voided'; end if;
  if exists (
    select 1 from public.receipt_allocations ra
    join public.receipts r on r.organization_id = ra.organization_id and r.id = ra.receipt_id
    where ra.invoice_id = p_invoice_id and ra.reversed_at is null and r.status = 'posted'
  ) then raise exception 'Cannot void an invoice with posted receipts'; end if;
  if exists (
    select 1 from public.credit_notes
    where invoice_id = p_invoice_id and status = 'issued'
  ) then raise exception 'Cannot void an invoice with issued credit notes'; end if;

  update public.invoices set
    status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_invoice_id;

  update public.invoice_items set is_active = false
  where invoice_id = p_invoice_id and is_active;
end;
$$;

create or replace function public.record_receipt(
  p_organization_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_currency text,
  p_receipt_date date,
  p_payment_method public.receipt_method,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_receipt_id uuid;
  assigned_number text;
  currency_code text := upper(trim(coalesce(p_currency, '')));
  effective_date date := coalesce(p_receipt_date, current_date);
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then raise exception 'Not authorized to record receipts'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Receipt amount must be greater than zero'; end if;
  if currency_code not in ('USD', 'LYD') then raise exception 'Currency must be USD or LYD'; end if;

  perform 1 from public.clients c
  where c.organization_id = p_organization_id and c.id = p_client_id;
  if not found then raise exception 'Client not found'; end if;

  assigned_number := public.next_financial_document_number(
    p_organization_id, 'receipt', effective_date
  );

  insert into public.receipts (
    organization_id, client_id, receipt_number, receipt_date, amount,
    currency, payment_method, reference, notes
  ) values (
    p_organization_id, p_client_id, assigned_number, effective_date, p_amount,
    currency_code, p_payment_method, nullif(trim(p_reference), ''), nullif(trim(p_notes), '')
  ) returning id into result_receipt_id;

  return result_receipt_id;
end;
$$;

create or replace function public.allocate_receipt(
  p_organization_id uuid,
  p_receipt_id uuid,
  p_invoice_id uuid,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_receipt public.receipts%rowtype;
  target_invoice public.invoices%rowtype;
  receipt_allocated numeric(14,2);
  invoice_allocated numeric(14,2);
  invoice_credited numeric(14,2);
  existing_allocation_id uuid;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then raise exception 'Not authorized to allocate receipts'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Allocation amount must be greater than zero'; end if;

  select * into target_receipt from public.receipts
  where organization_id = p_organization_id and id = p_receipt_id
  for update;
  if not found or target_receipt.status <> 'posted' then raise exception 'Posted receipt not found'; end if;

  select * into target_invoice from public.invoices
  where organization_id = p_organization_id and id = p_invoice_id
  for update;
  if not found or target_invoice.status in ('draft', 'voided') then raise exception 'Open issued invoice not found'; end if;
  if target_receipt.client_id <> target_invoice.client_id then raise exception 'Receipt and invoice must belong to the same client'; end if;
  if target_receipt.currency <> target_invoice.currency then raise exception 'Receipt and invoice currencies must match'; end if;

  select coalesce(sum(amount), 0)::numeric(14,2) into receipt_allocated
  from public.receipt_allocations
  where receipt_id = p_receipt_id and reversed_at is null;
  if receipt_allocated + p_amount > target_receipt.amount then raise exception 'Allocation exceeds the unallocated receipt amount'; end if;

  select coalesce(sum(ra.amount), 0)::numeric(14,2) into invoice_allocated
  from public.receipt_allocations ra
  join public.receipts r on r.organization_id = ra.organization_id and r.id = ra.receipt_id
  where ra.invoice_id = p_invoice_id and ra.reversed_at is null and r.status = 'posted';

  select coalesce(sum(total), 0)::numeric(14,2) into invoice_credited
  from public.credit_notes
  where invoice_id = p_invoice_id and status = 'issued';

  if invoice_allocated + invoice_credited + p_amount > target_invoice.grand_total then
    raise exception 'Allocation exceeds the invoice balance';
  end if;

  select id into existing_allocation_id
  from public.receipt_allocations
  where receipt_id = p_receipt_id and invoice_id = p_invoice_id and reversed_at is null
  for update;

  if existing_allocation_id is null then
    insert into public.receipt_allocations (
      organization_id, receipt_id, invoice_id, amount
    ) values (
      p_organization_id, p_receipt_id, p_invoice_id, p_amount
    ) returning id into existing_allocation_id;
  else
    update public.receipt_allocations
    set amount = amount + p_amount, allocated_at = now(), allocated_by = auth.uid()
    where id = existing_allocation_id;
  end if;

  perform public.refresh_invoice_status(p_invoice_id);
  return existing_allocation_id;
end;
$$;

create or replace function public.void_receipt(
  p_organization_id uuid,
  p_receipt_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_receipt public.receipts%rowtype;
  affected_invoice record;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then raise exception 'Not authorized to void receipts'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A void reason is required'; end if;

  select * into target_receipt from public.receipts
  where organization_id = p_organization_id and id = p_receipt_id
  for update;
  if not found then raise exception 'Receipt not found'; end if;
  if target_receipt.status <> 'posted' then raise exception 'Receipt is already voided'; end if;

  update public.receipts set
    status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_receipt_id;

  update public.receipt_allocations set
    reversed_at = now(), reversed_by = auth.uid(), reversal_reason = trim(p_reason)
  where receipt_id = p_receipt_id and reversed_at is null;

  for affected_invoice in
    select distinct invoice_id from public.receipt_allocations where receipt_id = p_receipt_id
  loop
    perform public.refresh_invoice_status(affected_invoice.invoice_id);
  end loop;
end;
$$;

create or replace function public.create_credit_note_draft(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_description text,
  p_amount numeric,
  p_reason text,
  p_issue_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.invoices%rowtype;
  result_credit_note_id uuid;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','accountant']::public.organization_role[]
  ) then raise exception 'Not authorized to prepare credit notes'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Credit amount must be greater than zero'; end if;
  if char_length(trim(coalesce(p_description, ''))) < 2 then raise exception 'Credit description is required'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Credit reason is required'; end if;

  select * into target_invoice from public.invoices
  where organization_id = p_organization_id and id = p_invoice_id
  for update;
  if not found or target_invoice.status in ('draft', 'voided') then raise exception 'Issued invoice not found'; end if;

  insert into public.credit_notes (
    organization_id, client_id, invoice_id, issue_date, currency, reason
  ) values (
    p_organization_id, target_invoice.client_id, p_invoice_id,
    coalesce(p_issue_date, current_date), target_invoice.currency, trim(p_reason)
  ) returning id into result_credit_note_id;

  insert into public.credit_note_items (
    organization_id, credit_note_id, description, amount
  ) values (
    p_organization_id, result_credit_note_id, trim(p_description), p_amount
  );

  return result_credit_note_id;
end;
$$;

create or replace function public.issue_credit_note(
  p_organization_id uuid,
  p_credit_note_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_note public.credit_notes%rowtype;
  target_invoice public.invoices%rowtype;
  calculated_total numeric(14,2);
  previous_credits numeric(14,2);
  assigned_number text;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager']::public.organization_role[]
  ) then raise exception 'Only an owner or manager can issue credit notes'; end if;

  select * into target_note from public.credit_notes
  where organization_id = p_organization_id and id = p_credit_note_id
  for update;
  if not found then raise exception 'Credit note not found'; end if;
  if target_note.status <> 'draft' then raise exception 'Only draft credit notes can be issued'; end if;

  select * into target_invoice from public.invoices
  where organization_id = p_organization_id and id = target_note.invoice_id
  for update;
  if not found or target_invoice.status in ('draft', 'voided') then raise exception 'Issued invoice not found'; end if;

  select coalesce(sum(amount), 0)::numeric(14,2) into calculated_total
  from public.credit_note_items
  where organization_id = p_organization_id and credit_note_id = p_credit_note_id;
  if calculated_total <= 0 then raise exception 'Credit note must contain items'; end if;

  select coalesce(sum(total), 0)::numeric(14,2) into previous_credits
  from public.credit_notes
  where invoice_id = target_note.invoice_id and status = 'issued';
  if previous_credits + calculated_total > target_invoice.grand_total then
    raise exception 'Credit notes cannot exceed the original invoice total';
  end if;

  assigned_number := public.next_financial_document_number(
    p_organization_id, 'credit_note', target_note.issue_date
  );
  update public.credit_notes set
    credit_note_number = assigned_number,
    total = calculated_total,
    status = 'issued',
    issued_at = now(),
    issued_by = auth.uid()
  where id = p_credit_note_id;

  perform public.refresh_invoice_status(target_note.invoice_id);
  return assigned_number;
end;
$$;

create or replace function public.void_credit_note(
  p_organization_id uuid,
  p_credit_note_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_note public.credit_notes%rowtype;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager']::public.organization_role[]
  ) then raise exception 'Only an owner or manager can void credit notes'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A void reason is required'; end if;

  select * into target_note from public.credit_notes
  where organization_id = p_organization_id and id = p_credit_note_id
  for update;
  if not found then raise exception 'Credit note not found'; end if;
  if target_note.status = 'voided' then raise exception 'Credit note is already voided'; end if;

  update public.credit_notes set
    status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_credit_note_id;

  perform public.refresh_invoice_status(target_note.invoice_id);
end;
$$;

create view public.invoice_financial_summary
with (security_invoker = true)
as
select
  i.organization_id,
  i.id as invoice_id,
  i.client_id,
  i.invoice_number,
  i.issue_date,
  i.due_date,
  i.currency,
  i.status as stored_status,
  i.grand_total,
  coalesce((
    select sum(ra.amount)
    from public.receipt_allocations ra
    join public.receipts r
      on r.organization_id = ra.organization_id and r.id = ra.receipt_id
    where ra.invoice_id = i.id and ra.reversed_at is null and r.status = 'posted'
  ), 0)::numeric(14,2) as paid_total,
  coalesce((
    select sum(cn.total)
    from public.credit_notes cn
    where cn.invoice_id = i.id and cn.status = 'issued'
  ), 0)::numeric(14,2) as credited_total,
  (
    i.grand_total
    - coalesce((
      select sum(ra.amount)
      from public.receipt_allocations ra
      join public.receipts r
        on r.organization_id = ra.organization_id and r.id = ra.receipt_id
      where ra.invoice_id = i.id and ra.reversed_at is null and r.status = 'posted'
    ), 0)
    - coalesce((
      select sum(cn.total)
      from public.credit_notes cn
      where cn.invoice_id = i.id and cn.status = 'issued'
    ), 0)
  )::numeric(14,2) as balance_total,
  case
    when i.status = 'voided' then 'voided'::public.invoice_status
    when i.status = 'draft' then 'draft'::public.invoice_status
    when i.grand_total - coalesce((
      select sum(ra.amount) from public.receipt_allocations ra
      join public.receipts r on r.organization_id = ra.organization_id and r.id = ra.receipt_id
      where ra.invoice_id = i.id and ra.reversed_at is null and r.status = 'posted'
    ), 0) - coalesce((
      select sum(cn.total) from public.credit_notes cn
      where cn.invoice_id = i.id and cn.status = 'issued'
    ), 0) <= 0 then 'paid'::public.invoice_status
    when i.due_date < current_date then 'overdue'::public.invoice_status
    when i.status = 'partially_paid' then 'partially_paid'::public.invoice_status
    else 'issued'::public.invoice_status
  end as effective_status
from public.invoices i;

create view public.receipt_financial_summary
with (security_invoker = true)
as
select
  r.organization_id,
  r.id as receipt_id,
  r.client_id,
  r.receipt_number,
  r.receipt_date,
  r.currency,
  r.status,
  r.amount,
  coalesce(sum(ra.amount) filter (where ra.reversed_at is null), 0)::numeric(14,2) as allocated_total,
  (r.amount - coalesce(sum(ra.amount) filter (where ra.reversed_at is null), 0))::numeric(14,2) as unallocated_total
from public.receipts r
left join public.receipt_allocations ra
  on ra.organization_id = r.organization_id and ra.receipt_id = r.id
group by r.organization_id, r.id;

create view public.client_financial_summary
with (security_invoker = true)
as
with client_currencies as (
  select organization_id, client_id, currency from public.invoices
  union
  select organization_id, client_id, currency from public.receipts
)
select
  c.organization_id,
  c.id as client_id,
  c.name as client_name,
  cc.currency,
  coalesce(sum(ifs.grand_total) filter (where ifs.stored_status <> 'voided'), 0)::numeric(14,2) as invoiced_total,
  coalesce(sum(ifs.paid_total), 0)::numeric(14,2) as allocated_paid_total,
  coalesce(sum(ifs.credited_total), 0)::numeric(14,2) as credited_total,
  coalesce(sum(ifs.balance_total) filter (where ifs.stored_status <> 'voided'), 0)::numeric(14,2) as invoice_balance,
  coalesce((
    select sum(rfs.unallocated_total)
    from public.receipt_financial_summary rfs
    where rfs.organization_id = c.organization_id
      and rfs.client_id = c.id
      and rfs.currency = cc.currency
      and rfs.status = 'posted'
  ), 0)::numeric(14,2) as unapplied_credit,
  (
    coalesce(sum(ifs.balance_total) filter (where ifs.stored_status <> 'voided'), 0)
    - coalesce((
      select sum(rfs.unallocated_total)
      from public.receipt_financial_summary rfs
      where rfs.organization_id = c.organization_id
        and rfs.client_id = c.id
        and rfs.currency = cc.currency
        and rfs.status = 'posted'
    ), 0)
  )::numeric(14,2) as net_balance
from public.clients c
join client_currencies cc
  on cc.organization_id = c.organization_id and cc.client_id = c.id
left join public.invoice_financial_summary ifs
  on ifs.organization_id = c.organization_id
  and ifs.client_id = c.id
  and ifs.currency = cc.currency
group by c.organization_id, c.id, c.name, cc.currency;

create view public.unbilled_charges
with (security_invoker = true)
as
select
  c.organization_id,
  c.id as charge_id,
  v.client_id,
  c.vehicle_id,
  v.vin,
  concat_ws(' ', v.year, v.make, v.model, v.trim) as vehicle_label,
  c.category,
  c.description,
  c.amount,
  c.currency,
  c.charge_date
from public.charges c
join public.vehicles v
  on v.organization_id = c.organization_id and v.id = c.vehicle_id
where not exists (
  select 1 from public.invoice_items ii
  where ii.organization_id = c.organization_id and ii.charge_id = c.id and ii.is_active
);

alter table public.financial_settings enable row level security;
alter table public.document_sequences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_allocations enable row level security;
alter table public.credit_notes enable row level security;
alter table public.credit_note_items enable row level security;

create policy financial_settings_select_member on public.financial_settings
for select to authenticated using (public.is_organization_member(organization_id));
create policy financial_settings_insert_management on public.financial_settings
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[])
);
create policy financial_settings_update_management on public.financial_settings
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[]));

create policy document_sequences_select_finance on public.document_sequences
for select to authenticated using (
  public.has_organization_role(organization_id, array['owner','manager','accountant']::public.organization_role[])
);

create policy invoices_select_member on public.invoices
for select to authenticated using (public.is_organization_member(organization_id));
create policy invoice_items_select_member on public.invoice_items
for select to authenticated using (public.is_organization_member(organization_id));
create policy receipts_select_member on public.receipts
for select to authenticated using (public.is_organization_member(organization_id));
create policy receipt_allocations_select_member on public.receipt_allocations
for select to authenticated using (public.is_organization_member(organization_id));
create policy credit_notes_select_member on public.credit_notes
for select to authenticated using (public.is_organization_member(organization_id));
create policy credit_note_items_select_member on public.credit_note_items
for select to authenticated using (public.is_organization_member(organization_id));

grant select, insert, update on public.financial_settings to authenticated;
grant select on public.document_sequences to authenticated;
grant select on
  public.invoices,
  public.invoice_items,
  public.receipts,
  public.receipt_allocations,
  public.credit_notes,
  public.credit_note_items,
  public.invoice_financial_summary,
  public.receipt_financial_summary,
  public.client_financial_summary,
  public.unbilled_charges
to authenticated;

revoke all on function public.next_financial_document_number(uuid, public.financial_document_type, date) from public;
revoke all on function public.refresh_invoice_status(uuid) from public;
revoke all on function public.create_invoice_draft(uuid, uuid, uuid[], text, date, date, text, text) from public;
revoke all on function public.issue_invoice(uuid, uuid, numeric, numeric) from public;
revoke all on function public.void_invoice(uuid, uuid, text) from public;
revoke all on function public.record_receipt(uuid, uuid, numeric, text, date, public.receipt_method, text, text) from public;
revoke all on function public.allocate_receipt(uuid, uuid, uuid, numeric) from public;
revoke all on function public.void_receipt(uuid, uuid, text) from public;
revoke all on function public.create_credit_note_draft(uuid, uuid, text, numeric, text, date) from public;
revoke all on function public.issue_credit_note(uuid, uuid) from public;
revoke all on function public.void_credit_note(uuid, uuid, text) from public;

grant execute on function public.create_invoice_draft(uuid, uuid, uuid[], text, date, date, text, text) to authenticated;
grant execute on function public.issue_invoice(uuid, uuid, numeric, numeric) to authenticated;
grant execute on function public.void_invoice(uuid, uuid, text) to authenticated;
grant execute on function public.record_receipt(uuid, uuid, numeric, text, date, public.receipt_method, text, text) to authenticated;
grant execute on function public.allocate_receipt(uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.void_receipt(uuid, uuid, text) to authenticated;
grant execute on function public.create_credit_note_draft(uuid, uuid, text, numeric, text, date) to authenticated;
grant execute on function public.issue_credit_note(uuid, uuid) to authenticated;
grant execute on function public.void_credit_note(uuid, uuid, text) to authenticated;

alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.receipts;

commit;
