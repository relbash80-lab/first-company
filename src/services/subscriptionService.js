import { supabase } from '../config/supabase';

function throwFirstError(results) {
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

export async function loadSubscriptionCenter(organizationId) {
  const results = await Promise.all([
    supabase.from('plans').select('*').eq('is_active', true).order('display_order'),
    supabase.from('subscriptions').select('*, plans(*)').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('subscription_invoices').select('*, plans(name_ar, name_en), subscription_payments!subscription_payments_invoice_id_fkey(*)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'released'),
    supabase.from('platform_admins').select('user_id').maybeSingle(),
    supabase.from('usage_counters').select('storage_bytes').eq('organization_id', organizationId).order('period_start', { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc('subscription_entitlement', { target_organization_id: organizationId }).maybeSingle(),
  ]);
  throwFirstError(results);

  const [plans, subscription, invoices, members, activeVehicles, platformAdmin, usage, entitlement] = results;
  let pendingPayments = [];
  if (platformAdmin.data) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*, organizations(name), subscription_invoices!subscription_payments_invoice_id_fkey(invoice_number, total, billing_cycle, plans(name_ar, name_en))')
      .eq('status', 'pending')
      .order('created_at');
    if (error) throw error;
    pendingPayments = data ?? [];
  }

  return {
    plans: plans.data ?? [],
    subscription: subscription.data ?? null,
    invoices: invoices.data ?? [],
    memberCount: members.count ?? 0,
    activeVehicleCount: activeVehicles.count ?? 0,
    storageMb: Math.ceil(Number(usage.data?.storage_bytes || 0) / 1024 / 1024),
    entitlement: entitlement.data ?? null,
    isPlatformAdmin: Boolean(platformAdmin.data),
    pendingPayments,
  };
}

export async function loadSubscriptionInvoiceDocument(organizationId, invoiceId) {
  const results = await Promise.all([
    supabase.from('subscription_invoices').select('*, plans(name_ar, name_en, max_users, max_active_vehicles, max_storage_mb), subscription_payments!subscription_payments_invoice_id_fkey(*)').eq('organization_id', organizationId).eq('id', invoiceId).single(),
    supabase.from('organizations').select('id, name, default_currency, timezone').eq('id', organizationId).single(),
    supabase.from('financial_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
  ]);
  throwFirstError(results);
  return { ...results[0].data, organization: results[1].data, settings: results[2].data };
}

export async function loadSubscriptionPaymentDocument(organizationId, paymentId) {
  const results = await Promise.all([
    supabase.from('subscription_payments').select('*, subscription_invoices!subscription_payments_invoice_id_fkey(invoice_number, billing_cycle, period_start, period_end, plans(name_ar, name_en))').eq('organization_id', organizationId).eq('id', paymentId).eq('status', 'confirmed').single(),
    supabase.from('organizations').select('id, name, default_currency, timezone').eq('id', organizationId).single(),
    supabase.from('financial_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
  ]);
  throwFirstError(results);
  return { ...results[0].data, organization: results[1].data, settings: results[2].data };
}

export async function requestSubscriptionInvoice(organizationId, planId, billingCycle) {
  const { data, error } = await supabase.rpc('request_subscription_invoice', {
    p_organization_id: organizationId,
    p_plan_id: planId,
    p_billing_cycle: billingCycle,
  });
  if (error) throw error;
  return data;
}

export async function submitSubscriptionPayment({ organizationId, invoiceId, paymentMethod, reference, paidAt }) {
  const { data, error } = await supabase.rpc('submit_subscription_payment', {
    p_organization_id: organizationId,
    p_invoice_id: invoiceId,
    p_payment_method: paymentMethod,
    p_reference: reference,
    p_paid_at: paidAt,
  });
  if (error) throw error;
  return data;
}

export async function reviewSubscriptionPayment(paymentId, approve, notes) {
  const { error } = await supabase.rpc('review_subscription_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_notes: notes || null,
  });
  if (error) throw error;
}

export async function configurePlanPricing(planId, monthlyPrice, annualPrice, features) {
  const { error } = await supabase.rpc('configure_plan_pricing', {
    p_plan_id: planId,
    p_monthly_price_lyd: monthlyPrice === '' ? null : Number(monthlyPrice),
    p_annual_price_lyd: annualPrice === '' ? null : Number(annualPrice),
    p_features: features,
  });
  if (error) throw error;
}

export function subscribeToSubscription(organizationId, refresh) {
  const channel = supabase.channel(`subscription:${organizationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `organization_id=eq.${organizationId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_invoices', filter: `organization_id=eq.${organizationId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_payments', filter: `organization_id=eq.${organizationId}` }, refresh)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
