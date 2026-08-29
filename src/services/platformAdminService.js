import { supabase } from '../config/supabase';

function firstError(results) {
  return results.find((result) => result.error)?.error;
}

export async function loadPlatformAdminDashboard() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const results = await Promise.all([
    supabase.from('organizations').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*, plans(id, name_ar, name_en)').order('updated_at', { ascending: false }),
    supabase.from('organization_members').select('organization_id, user_id, role, is_active, joined_at').order('joined_at'),
    supabase.from('profiles').select('id, display_name, phone'),
    supabase.from('plans').select('*').order('display_order'),
    supabase.from('subscription_payments').select('id, organization_id, amount, status, created_at').eq('status', 'pending'),
    supabase.from('usage_counters').select('*').order('period_start', { ascending: false }),
    supabase.from('user_sessions').select('*').gte('last_seen_at', since).order('last_seen_at', { ascending: false }).limit(1000),
    supabase.from('feature_usage_daily').select('*').gte('usage_date', since.slice(0, 10)).order('usage_date', { ascending: false }).limit(2000),
    supabase.from('feature_catalog').select('*').order('display_order'),
    supabase.from('plan_entitlements').select('*').order('feature_code'),
    supabase.from('plan_price_versions').select('*').order('effective_from', { ascending: false }),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('release_notes').select('*').order('created_at', { ascending: false }),
    supabase.from('subscription_invoices').select('id, organization_id, total, status, issue_date, due_date, created_at').order('created_at', { ascending: false }),
  ]);
  const error = firstError(results);
  if (error) throw error;

  const [organizations, subscriptions, members, profiles, plans, pendingPayments, usageCounters, sessions, featureUsage, featureCatalog, planEntitlements, priceVersions, auditLogs, releases, subscriptionInvoices] = results.map((result) => result.data ?? []);
  const subscriptionByOrganization = new Map(subscriptions.map((item) => [item.organization_id, item]));
  const profilesById = new Map(profiles.map((item) => [item.id, item]));
  const membersByOrganization = new Map();
  const usageByOrganization = new Map();

  for (const member of members) {
    const list = membersByOrganization.get(member.organization_id) ?? [];
    list.push({ ...member, profile: profilesById.get(member.user_id) ?? null });
    membersByOrganization.set(member.organization_id, list);
  }
  for (const usage of usageCounters) {
    if (!usageByOrganization.has(usage.organization_id)) usageByOrganization.set(usage.organization_id, usage);
  }

  return {
    organizations: organizations.map((organization) => ({
      ...organization,
      subscription: subscriptionByOrganization.get(organization.id) ?? null,
      members: membersByOrganization.get(organization.id) ?? [],
      usage: usageByOrganization.get(organization.id) ?? null,
      recentSessions: sessions.filter((item) => item.organization_id === organization.id),
    })),
    plans,
    pendingPayments,
    sessions,
    featureUsage,
    featureCatalog,
    planEntitlements,
    priceVersions,
    auditLogs: auditLogs.map((item) => ({ ...item, actor: profilesById.get(item.actor_id) ?? null })),
    releases,
    subscriptionInvoices,
  };
}

export async function configurePlatformPlan(plan, entitlements) {
  const { error } = await supabase.rpc('platform_admin_configure_plan', {
    p_plan_id: plan.id,
    p_name_ar: plan.name_ar,
    p_name_en: plan.name_en,
    p_monthly_price_lyd: plan.monthly_price_lyd === '' ? null : Number(plan.monthly_price_lyd),
    p_annual_price_lyd: plan.annual_price_lyd === '' ? null : Number(plan.annual_price_lyd),
    p_max_users: plan.max_users === '' ? null : Number(plan.max_users),
    p_max_active_vehicles: plan.max_active_vehicles === '' ? null : Number(plan.max_active_vehicles),
    p_max_storage_mb: plan.max_storage_mb === '' ? null : Number(plan.max_storage_mb),
    p_trial_days: Number(plan.trial_days || 0),
    p_is_public: Boolean(plan.is_public),
    p_is_active: Boolean(plan.is_active),
    p_features: plan.features ?? [],
    p_entitlements: entitlements,
  });
  if (error) throw error;
}

export async function publishPlatformRelease(release) {
  const { data, error } = await supabase.rpc('platform_admin_publish_release', {
    p_version: release.version,
    p_title_ar: release.title_ar,
    p_title_en: release.title_en,
    p_summary_ar: release.summary_ar || null,
    p_summary_en: release.summary_en || null,
    p_changes: release.changes ?? [],
    p_publish: release.status !== 'draft',
  });
  if (error) throw error;
  return data;
}

export async function reviewPlatformPayment(paymentId, approve, notes = null) {
  const { error } = await supabase.rpc('review_subscription_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_notes: notes,
  });
  if (error) throw error;
}

export async function updatePlatformSubscription({ organizationId, planId, status, periodEnd }) {
  const { error } = await supabase.rpc('platform_admin_update_subscription', {
    p_organization_id: organizationId,
    p_plan_id: planId,
    p_status: status,
    p_period_end: periodEnd || null,
  });
  if (error) throw error;
}

export async function updatePlatformMember({ organizationId, userId, role, isActive }) {
  const { error } = await supabase.rpc('platform_admin_update_member', {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
  });
  if (error) throw error;
}

export async function updatePlatformOrganization({ organizationId, isActive }) {
  const { error } = await supabase.rpc('platform_admin_update_organization', {
    p_organization_id: organizationId,
    p_is_active: isActive,
  });
  if (error) throw error;
}
