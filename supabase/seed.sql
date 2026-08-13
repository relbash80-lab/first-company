insert into public.plans (
  id, name_ar, name_en, max_users, max_active_vehicles, max_storage_mb, trial_days, is_public
) values
  ('trial', 'تجريبية', 'Trial', 3, 50, 250, 14, true),
  ('starter', 'أساسية', 'Starter', 5, 250, 1024, 0, true),
  ('professional', 'احترافية', 'Professional', 20, 2000, 10240, 0, true),
  ('enterprise', 'مؤسسات', 'Enterprise', null, null, null, 0, false)
on conflict (id) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  max_users = excluded.max_users,
  max_active_vehicles = excluded.max_active_vehicles,
  max_storage_mb = excluded.max_storage_mb,
  trial_days = excluded.trial_days,
  is_public = excluded.is_public,
  updated_at = now();
