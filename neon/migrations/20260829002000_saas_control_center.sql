begin;

-- SaaS control center: feature catalog, versioned pricing, tenant usage,
-- release notes and database-enforced subscription limits.

alter table public.audit_logs alter column organization_id drop not null;
alter table public.audit_logs add column if not exists source text not null default 'database';
alter table public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.usage_counters add column if not exists active_users integer not null default 0 check (active_users >= 0);
alter table public.usage_counters add column if not exists session_count integer not null default 0 check (session_count >= 0);
alter table public.usage_counters add column if not exists action_count integer not null default 0 check (action_count >= 0);
alter table public.usage_counters add column if not exists export_count integer not null default 0 check (export_count >= 0);

create table if not exists public.feature_catalog (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  category text not null default 'operations',
  unit text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_entitlements (
  plan_id text not null references public.plans(id) on delete cascade,
  feature_code text not null references public.feature_catalog(code) on delete cascade,
  enabled boolean not null default true,
  limit_value bigint check (limit_value is null or limit_value >= 0),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (plan_id, feature_code)
);

create table if not exists public.organization_entitlement_overrides (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_code text not null references public.feature_catalog(code) on delete cascade,
  enabled boolean,
  limit_value bigint check (limit_value is null or limit_value >= 0),
  reason text,
  expires_at timestamptz,
  created_by uuid references app_auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, feature_code)
);

create table if not exists public.plan_price_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete cascade,
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  amount_lyd numeric(14,2) not null check (amount_lyd > 0),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid references app_auth.users(id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create unique index if not exists plan_price_versions_current_idx
  on public.plan_price_versions(plan_id, billing_cycle)
  where effective_to is null;
create index if not exists plan_price_versions_history_idx
  on public.plan_price_versions(plan_id, billing_cycle, effective_from desc);

create table if not exists public.user_sessions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references app_auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  device_type text not null default 'unknown' check (device_type in ('desktop', 'tablet', 'mobile', 'unknown')),
  browser_family text,
  os_family text,
  last_path text,
  event_count integer not null default 1 check (event_count >= 1)
);

create index if not exists user_sessions_org_seen_idx
  on public.user_sessions(organization_id, last_seen_at desc);
create index if not exists user_sessions_user_seen_idx
  on public.user_sessions(user_id, last_seen_at desc);

create table if not exists public.feature_usage_daily (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references app_auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  feature_code text not null references public.feature_catalog(code),
  action_count integer not null default 0 check (action_count >= 0),
  last_used_at timestamptz not null default now(),
  primary key (organization_id, user_id, usage_date, feature_code)
);

create index if not exists feature_usage_org_date_idx
  on public.feature_usage_daily(organization_id, usage_date desc, feature_code);

create table if not exists public.release_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title_ar text not null,
  title_en text not null,
  summary_ar text,
  summary_en text,
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  released_at timestamptz,
  created_by uuid references app_auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_catalog
  (code, name_ar, name_en, description_ar, description_en, category, unit, display_order)
values
  ('team_members', 'أعضاء الفريق', 'Team members', 'عدد المستخدمين النشطين داخل حساب الشركة', 'Active users in the company workspace', 'limits', 'users', 10),
  ('active_vehicles', 'السيارات النشطة', 'Active vehicles', 'عدد السيارات التي لم تُسلّم بعد', 'Vehicles not yet released', 'limits', 'vehicles', 20),
  ('storage_mb', 'التخزين', 'Storage', 'حجم ملفات السيارات والحاويات', 'Vehicle and container file storage', 'limits', 'MB', 30),
  ('vehicle_center', 'مركز السيارات', 'Vehicle center', 'إدارة السيارات والبحث والفلاتر', 'Vehicle operations, search and filters', 'operations', null, 40),
  ('containers', 'الحاويات والشحن', 'Containers and shipping', 'إدارة الحاويات وربط السيارات', 'Container and shipping workflows', 'operations', null, 50),
  ('finance', 'المالية', 'Finance', 'الفواتير والإيصالات وكشوف الحساب', 'Invoices, receipts and statements', 'finance', null, 60),
  ('documents', 'المستندات', 'Documents', 'رفع وحفظ مستندات السيارات والحاويات', 'Vehicle and container documents', 'operations', null, 70),
  ('watchlist', 'قائمة المتابعة', 'Watchlist', 'متابعة السيارات المهمة لكل مستخدم', 'Personal vehicle watchlist', 'productivity', null, 80),
  ('saved_searches', 'البحث المحفوظ', 'Saved searches', 'حفظ الفلاتر وعمليات البحث المتكررة', 'Reusable searches and filters', 'productivity', 'searches', 90),
  ('csv_export', 'تصدير CSV', 'CSV export', 'تصدير البيانات التشغيلية والمالية', 'Operational and financial data export', 'reports', 'exports', 100),
  ('advanced_reports', 'التقارير المتقدمة', 'Advanced reports', 'مؤشرات الأداء وتقارير الاستخدام', 'Performance and usage analytics', 'reports', null, 110),
  ('audit_log', 'سجل التدقيق', 'Audit log', 'عرض سجل التغييرات الحساسة', 'Review sensitive data changes', 'governance', 'days', 120),
  ('release_notes', 'سجل الإصدارات', 'Release notes', 'متابعة الميزات والإصلاحات المنشورة', 'Published features and fixes', 'governance', null, 130)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  category = excluded.category,
  unit = excluded.unit,
  display_order = excluded.display_order,
  updated_at = now();

-- Preserve every currently working feature. Platform admins can tighten future
-- plans from the catalog UI without silently removing existing capability.
insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select p.id, f.code, true,
  case f.code
    when 'team_members' then p.max_users::bigint
    when 'active_vehicles' then p.max_active_vehicles::bigint
    when 'storage_mb' then p.max_storage_mb::bigint
    else null
  end
from public.plans p
cross join public.feature_catalog f
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_price_versions (plan_id, billing_cycle, amount_lyd, created_by)
select id, 'monthly', monthly_price_lyd, app_auth.uid()
from public.plans
where monthly_price_lyd is not null and monthly_price_lyd > 0
on conflict do nothing;

insert into public.plan_price_versions (plan_id, billing_cycle, amount_lyd, created_by)
select id, 'annual', annual_price_lyd, app_auth.uid()
from public.plans
where annual_price_lyd is not null and annual_price_lyd > 0
on conflict do nothing;

create or replace function public.subscription_feature_entitlement(
  target_organization_id uuid,
  target_feature_code text
)
returns table (
  enabled boolean,
  reason text,
  limit_value bigint,
  current_value bigint,
  plan_id text,
  subscription_status public.subscription_status,
  effective_end timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app_auth
as $$
declare
  target_plan text;
  target_status public.subscription_status;
  target_end timestamptz;
  org_active boolean;
  base_enabled boolean;
  base_limit bigint;
  override_enabled boolean;
  override_limit bigint;
  override_found boolean;
  measured bigint := 0;
begin
  if not (public.is_organization_member(target_organization_id) or public.is_platform_admin()) then
    raise exception 'Organization access required';
  end if;

  select o.is_active, s.plan_id, s.status,
    case when s.status = 'trialing' then s.trial_ends_at else s.current_period_end end
  into org_active, target_plan, target_status, target_end
  from public.organizations o
  left join public.subscriptions s on s.organization_id = o.id
  where o.id = target_organization_id;

  if not found then raise exception 'Organization not found'; end if;

  select pe.enabled, pe.limit_value
  into base_enabled, base_limit
  from public.plan_entitlements pe
  where pe.plan_id = target_plan and pe.feature_code = target_feature_code;

  select oe.enabled, oe.limit_value, true
  into override_enabled, override_limit, override_found
  from public.organization_entitlement_overrides oe
  where oe.organization_id = target_organization_id
    and oe.feature_code = target_feature_code
    and (oe.expires_at is null or oe.expires_at > now());

  base_enabled := coalesce(case when override_found then override_enabled else null end, base_enabled, false);
  base_limit := case when override_found and override_limit is not null then override_limit else base_limit end;

  case target_feature_code
    when 'team_members' then
      select count(*) into measured from public.organization_members
      where organization_id = target_organization_id and is_active;
    when 'active_vehicles' then
      select count(*) into measured from public.vehicles
      where organization_id = target_organization_id and status <> 'released';
    when 'storage_mb' then
      select ceil(coalesce(sum(size_bytes), 0)::numeric / 1048576)::bigint into measured
      from public.documents where organization_id = target_organization_id;
    when 'saved_searches' then
      select count(*) into measured from public.vehicle_saved_searches
      where organization_id = target_organization_id;
    when 'watchlist' then
      select count(*) into measured from public.vehicle_watchlist
      where organization_id = target_organization_id;
    when 'csv_export' then
      select coalesce(sum(action_count), 0) into measured from public.feature_usage_daily
      where organization_id = target_organization_id
        and feature_code = target_feature_code
        and usage_date >= date_trunc('month', current_date)::date;
    else measured := 0;
  end case;

  return query select
    case
      when org_active is not true then false
      when target_status = 'trialing' and coalesce(target_end, '-infinity') <= now() then false
      when target_status = 'active' and coalesce(target_end, '-infinity') <= now() then false
      when target_status in ('past_due', 'suspended', 'canceled') then false
      when base_enabled is not true then false
      when base_limit is not null and measured >= base_limit then false
      else true
    end,
    case
      when org_active is not true then 'organization_inactive'
      when target_status is null then 'subscription_missing'
      when target_status = 'trialing' and coalesce(target_end, '-infinity') <= now() then 'trial_expired'
      when target_status = 'active' and coalesce(target_end, '-infinity') <= now() then 'subscription_expired'
      when target_status in ('past_due', 'suspended', 'canceled') then target_status::text
      when base_enabled is not true then 'feature_not_in_plan'
      when base_limit is not null and measured >= base_limit then 'feature_limit_reached'
      else 'allowed'
    end,
    base_limit, measured, target_plan, target_status, target_end;
end;
$$;

create or replace function public.record_usage_event(
  p_organization_id uuid,
  p_session_id uuid,
  p_feature_code text,
  p_event_name text,
  p_path text default null,
  p_device_type text default 'unknown',
  p_browser_family text default null,
  p_os_family text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_auth
as $$
declare
  current_user_id uuid := app_auth.uid();
  month_start date := date_trunc('month', current_date)::date;
begin
  if current_user_id is null or not public.is_organization_member(p_organization_id) then
    raise exception 'Organization access required';
  end if;
  if p_feature_code !~ '^[a-z][a-z0-9_]*$' or length(coalesce(p_event_name, '')) not between 1 and 80 then
    raise exception 'Invalid usage event';
  end if;

  insert into public.user_sessions
    (id, organization_id, user_id, device_type, browser_family, os_family, last_path)
  values
    (p_session_id, p_organization_id, current_user_id,
     case when p_device_type in ('desktop','tablet','mobile') then p_device_type else 'unknown' end,
     left(p_browser_family, 40), left(p_os_family, 40), left(p_path, 240))
  on conflict (id) do update set
    last_seen_at = now(), last_path = excluded.last_path,
    event_count = public.user_sessions.event_count + 1;

  insert into public.feature_usage_daily
    (organization_id, user_id, usage_date, feature_code, action_count)
  values (p_organization_id, current_user_id, current_date, p_feature_code, 1)
  on conflict (organization_id, user_id, usage_date, feature_code)
  do update set action_count = public.feature_usage_daily.action_count + 1, last_used_at = now();

  insert into public.usage_counters
    (organization_id, period_start, active_vehicles, member_count, storage_bytes,
     active_users, session_count, action_count, export_count, updated_at)
  select p_organization_id, month_start,
    (select count(*) from public.vehicles where organization_id = p_organization_id and status <> 'released'),
    (select count(*) from public.organization_members where organization_id = p_organization_id and is_active),
    (select coalesce(sum(size_bytes), 0) from public.documents where organization_id = p_organization_id),
    (select count(distinct user_id) from public.user_sessions where organization_id = p_organization_id and last_seen_at >= month_start),
    (select count(*) from public.user_sessions where organization_id = p_organization_id and started_at >= month_start),
    (select coalesce(sum(action_count), 0) from public.feature_usage_daily where organization_id = p_organization_id and usage_date >= month_start),
    (select coalesce(sum(action_count), 0) from public.feature_usage_daily where organization_id = p_organization_id and usage_date >= month_start and feature_code = 'csv_export'),
    now()
  on conflict (organization_id, period_start) do update set
    active_vehicles = excluded.active_vehicles,
    member_count = excluded.member_count,
    storage_bytes = excluded.storage_bytes,
    active_users = excluded.active_users,
    session_count = excluded.session_count,
    action_count = excluded.action_count,
    export_count = excluded.export_count,
    updated_at = now();
end;
$$;

create or replace function public.platform_admin_configure_plan(
  p_plan_id text,
  p_name_ar text,
  p_name_en text,
  p_monthly_price_lyd numeric,
  p_annual_price_lyd numeric,
  p_max_users integer,
  p_max_active_vehicles integer,
  p_max_storage_mb integer,
  p_trial_days integer,
  p_is_public boolean,
  p_is_active boolean,
  p_features jsonb,
  p_entitlements jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_auth
as $$
declare
  old_row public.plans%rowtype;
  new_row public.plans%rowtype;
  entitlement jsonb;
  cycle_name text;
  old_amount numeric;
begin
  if not public.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if p_plan_id = 'trial' and (p_monthly_price_lyd is not null or p_annual_price_lyd is not null) then
    raise exception 'Trial pricing cannot be changed';
  end if;
  if p_monthly_price_lyd is not null and p_monthly_price_lyd <= 0 then raise exception 'Monthly price must be positive'; end if;
  if p_annual_price_lyd is not null and p_annual_price_lyd <= 0 then raise exception 'Annual price must be positive'; end if;
  if jsonb_typeof(coalesce(p_features, '[]'::jsonb)) <> 'array' then raise exception 'Features must be an array'; end if;
  if jsonb_typeof(coalesce(p_entitlements, '[]'::jsonb)) <> 'array' then raise exception 'Entitlements must be an array'; end if;

  select * into old_row from public.plans where id = p_plan_id for update;
  if not found then raise exception 'Subscription plan not found'; end if;

  update public.plans set
    name_ar = nullif(trim(p_name_ar), ''), name_en = nullif(trim(p_name_en), ''),
    monthly_price_lyd = p_monthly_price_lyd, annual_price_lyd = p_annual_price_lyd,
    max_users = p_max_users, max_active_vehicles = p_max_active_vehicles,
    max_storage_mb = p_max_storage_mb, trial_days = p_trial_days,
    is_public = p_is_public, is_active = p_is_active,
    features = coalesce(p_features, '[]'::jsonb), updated_at = now()
  where id = p_plan_id returning * into new_row;

  for entitlement in select value from jsonb_array_elements(coalesce(p_entitlements, '[]'::jsonb)) loop
    insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value, config, updated_at)
    values (p_plan_id, entitlement->>'feature_code', coalesce((entitlement->>'enabled')::boolean, false),
      nullif(entitlement->>'limit_value','')::bigint, coalesce(entitlement->'config','{}'::jsonb), now())
    on conflict (plan_id, feature_code) do update set
      enabled = excluded.enabled, limit_value = excluded.limit_value,
      config = excluded.config, updated_at = now();
  end loop;

  foreach cycle_name in array array['monthly','annual'] loop
    old_amount := case when cycle_name = 'monthly' then old_row.monthly_price_lyd else old_row.annual_price_lyd end;
    if (case when cycle_name = 'monthly' then p_monthly_price_lyd else p_annual_price_lyd end) is distinct from old_amount then
      update public.plan_price_versions set effective_to = now()
      where plan_id = p_plan_id and billing_cycle = cycle_name and effective_to is null;
      if (case when cycle_name = 'monthly' then p_monthly_price_lyd else p_annual_price_lyd end) is not null then
        insert into public.plan_price_versions (plan_id, billing_cycle, amount_lyd, created_by)
        values (p_plan_id, cycle_name,
          case when cycle_name = 'monthly' then p_monthly_price_lyd else p_annual_price_lyd end,
          app_auth.uid());
      end if;
    end if;
  end loop;

  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, old_data, new_data, source)
  values (null, app_auth.uid(), 'platform.plan.configure', 'plans', p_plan_id, to_jsonb(old_row), to_jsonb(new_row), 'platform_console');
end;
$$;

create or replace function public.platform_admin_publish_release(
  p_version text,
  p_title_ar text,
  p_title_en text,
  p_summary_ar text,
  p_summary_en text,
  p_changes jsonb,
  p_publish boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_auth
as $$
declare release_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if p_version !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9.-]+)?$' then raise exception 'Invalid semantic version'; end if;
  if jsonb_typeof(coalesce(p_changes, '[]'::jsonb)) <> 'array' then raise exception 'Changes must be an array'; end if;

  insert into public.release_notes
    (version, title_ar, title_en, summary_ar, summary_en, changes, status, released_at, created_by)
  values
    (p_version, trim(p_title_ar), trim(p_title_en), p_summary_ar, p_summary_en,
     coalesce(p_changes, '[]'::jsonb), case when p_publish then 'published' else 'draft' end,
     case when p_publish then now() else null end, app_auth.uid())
  on conflict (version) do update set
    title_ar = excluded.title_ar, title_en = excluded.title_en,
    summary_ar = excluded.summary_ar, summary_en = excluded.summary_en,
    changes = excluded.changes, status = excluded.status,
    released_at = coalesce(public.release_notes.released_at, excluded.released_at), updated_at = now()
  returning id into release_id;

  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, new_data, source)
  values (null, app_auth.uid(), 'platform.release.publish', 'release_notes', release_id::text,
    jsonb_build_object('version', p_version, 'published', p_publish), 'platform_console');
  return release_id;
end;
$$;

-- Keep the earlier subscription-page pricing action compatible while making
-- every price change append-only in the history ledger.
create or replace function public.configure_plan_pricing(
  p_plan_id text,
  p_monthly_price_lyd numeric,
  p_annual_price_lyd numeric,
  p_features jsonb default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_auth
as $$
declare old_row public.plans%rowtype; new_row public.plans%rowtype; cycle_name text; old_amount numeric; new_amount numeric;
begin
  if not public.is_platform_admin() then raise exception 'Platform administrator access required'; end if;
  if p_plan_id = 'trial' then raise exception 'Trial pricing cannot be changed'; end if;
  if p_monthly_price_lyd is not null and p_monthly_price_lyd <= 0 then raise exception 'Monthly price must be positive'; end if;
  if p_annual_price_lyd is not null and p_annual_price_lyd <= 0 then raise exception 'Annual price must be positive'; end if;
  if p_features is not null and jsonb_typeof(p_features) <> 'array' then raise exception 'Features must be an array'; end if;
  select * into old_row from public.plans where id = p_plan_id for update;
  if not found then raise exception 'Subscription plan not found'; end if;
  update public.plans set monthly_price_lyd = p_monthly_price_lyd, annual_price_lyd = p_annual_price_lyd,
    features = coalesce(p_features, features), updated_at = now()
  where id = p_plan_id returning * into new_row;
  foreach cycle_name in array array['monthly','annual'] loop
    old_amount := case when cycle_name = 'monthly' then old_row.monthly_price_lyd else old_row.annual_price_lyd end;
    new_amount := case when cycle_name = 'monthly' then p_monthly_price_lyd else p_annual_price_lyd end;
    if new_amount is distinct from old_amount then
      update public.plan_price_versions set effective_to = now()
      where plan_id = p_plan_id and billing_cycle = cycle_name and effective_to is null;
      if new_amount is not null then
        insert into public.plan_price_versions (plan_id, billing_cycle, amount_lyd, created_by)
        values (p_plan_id, cycle_name, new_amount, app_auth.uid());
      end if;
    end if;
  end loop;
  insert into public.audit_logs (organization_id, actor_id, action, entity_table, entity_id, old_data, new_data, source)
  values (null, app_auth.uid(), 'platform.plan.pricing', 'plans', p_plan_id, to_jsonb(old_row), to_jsonb(new_row), 'subscription_center');
end;
$$;

create or replace function public.enforce_member_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare allowed boolean; reason text;
begin
  if new.is_active and (tg_op = 'INSERT' or old.is_active is not true) then
    if not exists (select 1 from public.subscriptions where organization_id = new.organization_id)
      or not exists (select 1 from public.organization_members where organization_id = new.organization_id and is_active) then
      return new;
    end if;
    select e.enabled, e.reason into allowed, reason
    from public.subscription_feature_entitlement(new.organization_id, 'team_members') e;
    if allowed is not true then raise exception '%', coalesce(reason, 'user_limit_reached'); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists organization_members_subscription_limit on public.organization_members;
create trigger organization_members_subscription_limit
before insert or update of is_active on public.organization_members
for each row execute function public.enforce_member_subscription_limit();

create or replace function public.enforce_document_storage_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare allowed boolean; feature_limit bigint; used bigint; projected bigint;
begin
  select e.enabled, e.limit_value, e.current_value into allowed, feature_limit, used
  from public.subscription_feature_entitlement(new.organization_id, 'storage_mb') e;
  projected := used + ceil(coalesce(new.size_bytes, 0)::numeric / 1048576)::bigint
    - case when tg_op = 'UPDATE' then ceil(coalesce(old.size_bytes, 0)::numeric / 1048576)::bigint else 0 end;
  if allowed is not true or (feature_limit is not null and projected > feature_limit) then
    raise exception 'storage_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_subscription_storage_limit on public.documents;
create trigger documents_subscription_storage_limit
before insert or update of size_bytes on public.documents
for each row execute function public.enforce_document_storage_limit();

create or replace function public.enforce_feature_access()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare feature_code text := tg_argv[0]; allowed boolean; reason text; target_org uuid;
begin
  target_org := coalesce(new.organization_id, old.organization_id);
  select e.enabled, e.reason into allowed, reason
  from public.subscription_feature_entitlement(target_org, feature_code) e;
  if allowed is not true then raise exception '%', coalesce(reason, 'feature_not_in_plan'); end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists vehicle_watchlist_feature_guard on public.vehicle_watchlist;
create trigger vehicle_watchlist_feature_guard before insert or update on public.vehicle_watchlist
for each row execute function public.enforce_feature_access('watchlist');
drop trigger if exists vehicle_saved_searches_feature_guard on public.vehicle_saved_searches;
create trigger vehicle_saved_searches_feature_guard before insert or update on public.vehicle_saved_searches
for each row execute function public.enforce_feature_access('saved_searches');
drop trigger if exists vehicles_feature_guard on public.vehicles;
create trigger vehicles_feature_guard before insert or update on public.vehicles
for each row execute function public.enforce_feature_access('vehicle_center');
drop trigger if exists containers_feature_guard on public.containers;
create trigger containers_feature_guard before insert or update on public.containers
for each row execute function public.enforce_feature_access('containers');
drop trigger if exists container_vehicles_feature_guard on public.container_vehicles;
create trigger container_vehicles_feature_guard before insert or update on public.container_vehicles
for each row execute function public.enforce_feature_access('containers');
drop trigger if exists documents_feature_guard on public.documents;
create trigger documents_feature_guard before insert or update on public.documents
for each row execute function public.enforce_feature_access('documents');
drop trigger if exists invoices_feature_guard on public.invoices;
create trigger invoices_feature_guard before insert or update on public.invoices
for each row execute function public.enforce_feature_access('finance');
drop trigger if exists invoice_items_feature_guard on public.invoice_items;
create trigger invoice_items_feature_guard before insert or update on public.invoice_items
for each row execute function public.enforce_feature_access('finance');
drop trigger if exists receipts_feature_guard on public.receipts;
create trigger receipts_feature_guard before insert or update on public.receipts
for each row execute function public.enforce_feature_access('finance');
drop trigger if exists receipt_allocations_feature_guard on public.receipt_allocations;
create trigger receipt_allocations_feature_guard before insert or update on public.receipt_allocations
for each row execute function public.enforce_feature_access('finance');
drop trigger if exists credit_notes_feature_guard on public.credit_notes;
create trigger credit_notes_feature_guard before insert or update on public.credit_notes
for each row execute function public.enforce_feature_access('finance');
drop trigger if exists credit_note_items_feature_guard on public.credit_note_items;
create trigger credit_note_items_feature_guard before insert or update on public.credit_note_items
for each row execute function public.enforce_feature_access('finance');

alter table public.feature_catalog enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.organization_entitlement_overrides enable row level security;
alter table public.plan_price_versions enable row level security;
alter table public.user_sessions enable row level security;
alter table public.feature_usage_daily enable row level security;
alter table public.release_notes enable row level security;

drop policy if exists feature_catalog_read on public.feature_catalog;
create policy feature_catalog_read on public.feature_catalog for select to authenticated using (is_active or public.is_platform_admin());
drop policy if exists plan_entitlements_read on public.plan_entitlements;
create policy plan_entitlements_read on public.plan_entitlements for select to authenticated using (true);
drop policy if exists entitlement_overrides_read on public.organization_entitlement_overrides;
create policy entitlement_overrides_read on public.organization_entitlement_overrides for select to authenticated
using (public.is_organization_member(organization_id) or public.is_platform_admin());
drop policy if exists price_versions_admin_read on public.plan_price_versions;
create policy price_versions_admin_read on public.plan_price_versions for select to authenticated using (public.is_platform_admin());
drop policy if exists user_sessions_management_read on public.user_sessions;
create policy user_sessions_management_read on public.user_sessions for select to authenticated
using (public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[]) or public.is_platform_admin());
drop policy if exists feature_usage_management_read on public.feature_usage_daily;
create policy feature_usage_management_read on public.feature_usage_daily for select to authenticated
using (public.has_organization_role(organization_id, array['owner','manager']::public.organization_role[]) or public.is_platform_admin());
drop policy if exists release_notes_read on public.release_notes;
create policy release_notes_read on public.release_notes for select to authenticated
using (status = 'published' or public.is_platform_admin());

revoke all on public.feature_catalog, public.plan_entitlements, public.organization_entitlement_overrides,
  public.plan_price_versions, public.user_sessions, public.feature_usage_daily, public.release_notes from public, anonymous;
grant select on public.feature_catalog, public.plan_entitlements, public.organization_entitlement_overrides,
  public.plan_price_versions, public.user_sessions, public.feature_usage_daily, public.release_notes to authenticated;

revoke all on function public.subscription_feature_entitlement(uuid, text) from public, anonymous;
revoke all on function public.record_usage_event(uuid, uuid, text, text, text, text, text, text) from public, anonymous;
revoke all on function public.platform_admin_configure_plan(text, text, text, numeric, numeric, integer, integer, integer, integer, boolean, boolean, jsonb, jsonb) from public, anonymous;
revoke all on function public.platform_admin_publish_release(text, text, text, text, text, jsonb, boolean) from public, anonymous;
grant execute on function public.subscription_feature_entitlement(uuid, text) to authenticated;
grant execute on function public.record_usage_event(uuid, uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.platform_admin_configure_plan(text, text, text, numeric, numeric, integer, integer, integer, integer, boolean, boolean, jsonb, jsonb) to authenticated;
grant execute on function public.platform_admin_publish_release(text, text, text, text, text, jsonb, boolean) to authenticated;
revoke all on function public.configure_plan_pricing(text, numeric, numeric, jsonb) from public, anonymous;
grant execute on function public.configure_plan_pricing(text, numeric, numeric, jsonb) to authenticated;

insert into public.release_notes
  (version, title_ar, title_en, summary_ar, summary_en, changes, status, released_at)
values
  ('1.1.0', 'مركز التحكم في الاشتراكات', 'Subscription control center',
   'مراقبة الاستخدام وإدارة الباقات والأسعار وسجل التدقيق والإصدارات.',
   'Usage monitoring, plan and pricing management, audit trail and release notes.',
   '["usage_monitoring","plan_entitlements","versioned_pricing","audit_console","responsive_admin"]'::jsonb,
   'published', now())
on conflict (version) do nothing;

select pg_notify('pgrst', 'reload schema');

commit;
