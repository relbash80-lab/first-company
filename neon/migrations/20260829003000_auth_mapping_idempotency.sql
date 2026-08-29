-- Make first-login identity provisioning safe when the auth listener and the
-- explicit login flow reach the mapping RPC at the same time.

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
    insert into app_auth.users (id, email, created_at)
    values (gen_random_uuid(), lower(current_email), now())
    on conflict (email) do update
      set email = excluded.email
    returning id into current_legacy_user_id;

    insert into public.profiles (id, display_name)
    values (
      current_legacy_user_id,
      coalesce(nullif(trim(current_name), ''), split_part(current_email, '@', 1))
    )
    on conflict (id) do nothing;
  end if;

  insert into app_auth.user_mappings (neon_user_id, legacy_user_id)
  values (current_neon_user_id, current_legacy_user_id)
  on conflict (neon_user_id) do nothing;

  select mapping.legacy_user_id
  into current_legacy_user_id
  from app_auth.user_mappings as mapping
  where mapping.neon_user_id = current_neon_user_id;

  return current_legacy_user_id;
end;
$$;

revoke all on function public.ensure_current_user_mapping() from public;
grant execute on function public.ensure_current_user_mapping() to authenticated;

select pg_notify('pgrst', 'reload schema');
