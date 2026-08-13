import { supabase } from '../config/supabase';

function throwFirstError(results) {
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

export async function loadFinanceWorkspace(organizationId) {
  const results = await Promise.all([
    supabase.from('clients').select('id, name, phone, email').eq('organization_id', organizationId).order('name'),
    supabase.from('unbilled_charges').select('*').eq('organization_id', organizationId).order('charge_date', { ascending: false }),
    supabase.from('invoices').select('*, clients(name), invoice_items(id, vehicle_id, category, description, vehicle_label, vin_snapshot, line_total)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('invoice_financial_summary').select('*').eq('organization_id', organizationId),
    supabase.from('receipts').select('*, clients(name)').eq('organization_id', organizationId).order('receipt_date', { ascending: false }),
    supabase.from('receipt_financial_summary').select('*').eq('organization_id', organizationId),
  ]);

  throwFirstError(results);
  const [clients, charges, invoices, invoiceSummaries, receipts, receiptSummaries] = results.map((result) => result.data ?? []);
  const invoiceSummaryById = new Map(invoiceSummaries.map((row) => [row.invoice_id, row]));
  const receiptSummaryById = new Map(receiptSummaries.map((row) => [row.receipt_id, row]));

  return {
    clients,
    charges,
    invoices: invoices.map((invoice) => ({ ...invoice, ...invoiceSummaryById.get(invoice.id) })),
    receipts: receipts.map((receipt) => ({ ...receipt, ...receiptSummaryById.get(receipt.id) })),
  };
}

export async function createInvoiceDraft({
  organizationId,
  clientId,
  chargeIds,
  currency,
  issueDate,
  dueDate,
  customerNotes,
  internalNotes,
}) {
  const { data, error } = await supabase.rpc('create_invoice_draft', {
    p_organization_id: organizationId,
    p_client_id: clientId,
    p_charge_ids: chargeIds,
    p_currency: currency,
    p_issue_date: issueDate,
    p_due_date: dueDate,
    p_customer_notes: customerNotes || null,
    p_internal_notes: internalNotes || null,
  });
  if (error) throw error;
  return data;
}

export async function issueInvoice(organizationId, invoiceId, { discount = 0, tax = 0 } = {}) {
  const { data, error } = await supabase.rpc('issue_invoice', {
    p_organization_id: organizationId,
    p_invoice_id: invoiceId,
    p_discount_total: Number(discount) || 0,
    p_tax_total: Number(tax) || 0,
  });
  if (error) throw error;
  return data;
}

export async function voidInvoice(organizationId, invoiceId, reason) {
  const { error } = await supabase.rpc('void_invoice', {
    p_organization_id: organizationId,
    p_invoice_id: invoiceId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function recordReceipt({
  organizationId,
  clientId,
  amount,
  currency,
  receiptDate,
  paymentMethod,
  reference,
  notes,
}) {
  const { data, error } = await supabase.rpc('record_receipt', {
    p_organization_id: organizationId,
    p_client_id: clientId,
    p_amount: Number(amount),
    p_currency: currency,
    p_receipt_date: receiptDate,
    p_payment_method: paymentMethod,
    p_reference: reference || null,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function allocateReceipt(organizationId, receiptId, invoiceId, amount) {
  const { data, error } = await supabase.rpc('allocate_receipt', {
    p_organization_id: organizationId,
    p_receipt_id: receiptId,
    p_invoice_id: invoiceId,
    p_amount: Number(amount),
  });
  if (error) throw error;
  return data;
}

export async function voidReceipt(organizationId, receiptId, reason) {
  const { error } = await supabase.rpc('void_receipt', {
    p_organization_id: organizationId,
    p_receipt_id: receiptId,
    p_reason: reason,
  });
  if (error) throw error;
}

export function subscribeToFinance(organizationId, refresh) {
  const channel = supabase.channel(`finance:${organizationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${organizationId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: `organization_id=eq.${organizationId}` }, refresh)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
