import { supabase } from '../config/supabase';

function firstError(results) {
  return results.find((result) => result.error)?.error;
}

export async function loadPlatformAdminDashboard() {
  const results = await Promise.all([
    supabase.from('organizations').select('*').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*, plans(id, name_ar, name_en)').order('updated_at', { ascending: false }),
    supabase.from('organization_members').select('organization_id, user_id, role, is_active, joined_at').order('joined_at'),
    supabase.from('profiles').select('id, display_name, phone'),
    supabase.from('plans').select('*').order('display_order'),
    supabase.from('subscription_payments').select('id, organization_id, amount, status, created_at').eq('status', 'pending'),
  ]);
  const error = firstError(results);
  if (error) throw error;

  const [organizations, subscriptions, members, profiles, plans, pendingPayments] = results.map((result) => result.data ?? []);
  const subscriptionByOrganization = new Map(subscriptions.map((item) => [item.organization_id, item]));
  const profilesById = new Map(profiles.map((item) => [item.id, item]));
  const membersByOrganization = new Map();

  for (const member of members) {
    const list = membersByOrganization.get(member.organization_id) ?? [];
    list.push({ ...member, profile: profilesById.get(member.user_id) ?? null });
    membersByOrganization.set(member.organization_id, list);
  }

  return {
    organizations: organizations.map((organization) => ({
      ...organization,
      subscription: subscriptionByOrganization.get(organization.id) ?? null,
      members: membersByOrganization.get(organization.id) ?? [],
    })),
    plans,
    pendingPayments,
  };
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
