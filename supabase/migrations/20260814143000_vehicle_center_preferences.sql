begin;

create table public.vehicle_watchlist (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, vehicle_id)
);

create index vehicle_watchlist_user_idx
  on public.vehicle_watchlist(user_id, organization_id, created_at desc);

create table public.vehicle_saved_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, name)
);

create index vehicle_saved_searches_user_idx
  on public.vehicle_saved_searches(user_id, organization_id, updated_at desc);

create trigger vehicle_saved_searches_set_updated_at
before update on public.vehicle_saved_searches
for each row execute function public.set_updated_at();

alter table public.vehicle_watchlist enable row level security;
alter table public.vehicle_saved_searches enable row level security;

create policy vehicle_watchlist_select_self on public.vehicle_watchlist
for select to authenticated using (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

create policy vehicle_watchlist_insert_self on public.vehicle_watchlist
for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.organization_id = organization_id
  )
);

create policy vehicle_watchlist_delete_self on public.vehicle_watchlist
for delete to authenticated using (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

create policy vehicle_saved_searches_select_self on public.vehicle_saved_searches
for select to authenticated using (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

create policy vehicle_saved_searches_insert_self on public.vehicle_saved_searches
for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

create policy vehicle_saved_searches_update_self on public.vehicle_saved_searches
for update to authenticated
using (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

create policy vehicle_saved_searches_delete_self on public.vehicle_saved_searches
for delete to authenticated using (
  user_id = (select auth.uid())
  and public.is_organization_member(organization_id)
);

commit;
