-- Compatibility layer for preserving legacy Supabase UUID references while
-- application authentication moves to Neon Auth / Better Auth.

create schema if not exists app_auth;

revoke all on schema app_auth from public;
grant usage on schema app_auth to anonymous, authenticated;

create table if not exists app_auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz
);

create table if not exists app_auth.user_mappings (
  neon_user_id text primary key,
  legacy_user_id uuid not null unique references app_auth.users(id) on delete cascade
);

revoke all on table app_auth.users from public, anonymous, authenticated;
revoke all on table app_auth.user_mappings from public, anonymous, authenticated;

create or replace function app_auth.uid()
returns uuid
language sql
stable
security definer
set search_path = app_auth, auth, pg_temp
as $$
  select mapping.legacy_user_id
  from app_auth.user_mappings as mapping
  where mapping.neon_user_id = auth.user_id()
  limit 1
$$;

revoke all on function app_auth.uid() from public;
grant execute on function app_auth.uid() to anonymous, authenticated;

-- Link the legacy Supabase UUIDs to the Neon Auth users created during the
-- migration.  Neon Auth owns these rows; this table only stores the stable
-- application identity used by the existing foreign keys and RLS policies.
insert into app_auth.user_mappings (neon_user_id, legacy_user_id)
select neon_user.id::text, legacy_user.id
from neon_auth."user" as neon_user
join app_auth.users as legacy_user
  on lower(legacy_user.email) = lower(neon_user.email)
on conflict do nothing;

create or replace function public.ensure_current_user_mapping()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_auth, neon_auth
as $$
declare
  current_neon_user_id text := auth.user_id();
  current_email text;
  current_name text;
  email_is_verified boolean;
  current_legacy_user_id uuid;
begin
  if current_neon_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select mapping.legacy_user_id
  into current_legacy_user_id
  from app_auth.user_mappings as mapping
  where mapping.neon_user_id = current_neon_user_id;

  if current_legacy_user_id is not null then
    return current_legacy_user_id;
  end if;

  select neon_user.email, neon_user.name, neon_user."emailVerified"
  into current_email, current_name, email_is_verified
  from neon_auth."user" as neon_user
  where neon_user.id::text = current_neon_user_id;

  if current_email is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  select legacy_user.id
  into current_legacy_user_id
  from app_auth.users as legacy_user
  where lower(legacy_user.email) = lower(current_email);

  if current_legacy_user_id is not null and not email_is_verified then
    raise exception 'EMAIL_VERIFICATION_REQUIRED';
  end if;

  if current_legacy_user_id is null then
    current_legacy_user_id := gen_random_uuid();

    insert into app_auth.users (id, email)
    values (current_legacy_user_id, lower(current_email));

    insert into public.profiles (id, display_name)
    values (
      current_legacy_user_id,
      coalesce(nullif(trim(current_name), ''), split_part(current_email, '@', 1))
    )
    on conflict (id) do nothing;
  end if;

  insert into app_auth.user_mappings (neon_user_id, legacy_user_id)
  values (current_neon_user_id, current_legacy_user_id);

  return current_legacy_user_id;
end;
$$;

revoke all on function public.ensure_current_user_mapping() from public;
grant execute on function public.ensure_current_user_mapping() to authenticated;
