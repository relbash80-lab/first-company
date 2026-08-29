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
    supabase.from('credit_notes').select('*, clients(name), invoices(invoice_number), credit_note_items(id, description, amount)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);

  throwFirstError(results);
  const [clients, charges, invoices, invoiceSummaries, receipts, receiptSummaries, creditNotes] = results.map((result) => result.data ?? []);
  const invoiceSummaryById = new Map(invoiceSummaries.map((row) => [row.invoice_id, row]));
  const receiptSummaryById = new Map(receiptSummaries.map((row) => [row.receipt_id, row]));

  return {
    clients,
    charges,
    invoices: invoices.map((invoice) => ({ ...invoice, ...invoiceSummaryById.get(invoice.id) })),
    receipts: receipts.map((receipt) => ({ ...receipt, ...receiptSummaryById.get(receipt.id) })),
    creditNotes,
  };
}

export async function loadInvoiceDocument(organizationId, invoiceId) {
  const results = await Promise.all([
    supabase.from('invoices').select('*, clients(name, phone, email, notes), invoice_items(id, category, description, vehicle_label, vin_snapshot, quantity, unit_price, line_total, sort_order)').eq('organization_id', organizationId).eq('id', invoiceId).single(),
    supabase.from('invoice_financial_summary').select('*').eq('organization_id', organizationId).eq('invoice_id', invoiceId).single(),
    supabase.from('financial_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('organizations').select('id, name, default_currency, timezone').eq('id', organizationId).single(),
    supabase.from('receipt_allocations').select('amount, allocated_at, receipts(receipt_number, receipt_date, status, payment_method, reference)').eq('organization_id', organizationId).eq('invoice_id', invoiceId).is('reversed_at', null),
    supabase.from('credit_notes').select('credit_note_number, issue_date, total, status, reason').eq('organization_id', organizationId).eq('invoice_id', invoiceId).eq('status', 'issued'),
  ]);
  throwFirstError(results);
  const [invoice, summary, settings, organization, allocations, creditNotes] = results.map((result) => result.data);
  return { ...invoice, ...summary, settings, organization, allocations: allocations ?? [], creditNotes: creditNotes ?? [] };
}

export async function loadReceiptDocument(organizationId, receiptId) {
  const results = await Promise.all([
    supabase.from('receipts').select('*, clients(name, phone, email), receipt_allocations(amount, allocated_at, reversed_at, invoices(invoice_number, issue_date, currency, grand_total))').eq('organization_id', organizationId).eq('id', receiptId).single(),
    supabase.from('receipt_financial_summary').select('*').eq('organization_id', organizationId).eq('receipt_id', receiptId).single(),
    supabase.from('financial_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('organizations').select('id, name, default_currency, timezone').eq('id', organizationId).single(),
  ]);
  throwFirstError(results);
  const [receipt, summary, settings, organization] = results.map((result) => result.data);
  return { ...receipt, ...summary, settings, organization };
}

export async function loadClientStatement(organizationId, clientId) {
  const results = await Promise.all([
    supabase.from('clients').select('id, name, phone, email, notes').eq('organization_id', organizationId).eq('id', clientId).single(),
    supabase.from('invoices').select('id, invoice_number, issue_date, due_date, currency, grand_total, status').eq('organization_id', organizationId).eq('client_id', clientId).neq('status', 'voided').neq('status', 'draft').order('issue_date'),
    supabase.from('receipts').select('id, receipt_number, receipt_date, currency, amount, status').eq('organization_id', organizationId).eq('client_id', clientId).eq('status', 'posted').order('receipt_date'),
    supabase.from('credit_notes').select('id, credit_note_number, issue_date, currency, total, reason, status').eq('organization_id', organizationId).eq('client_id', clientId).eq('status', 'issued').order('issue_date'),
    supabase.from('financial_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('organizations').select('id, name, default_currency, timezone').eq('id', organizationId).single(),
  ]);
  throwFirstError(results);
  const [client, invoices, receipts, creditNotes, settings, organization] = results.map((result) => result.data);
  return { client, invoices: invoices ?? [], receipts: receipts ?? [], creditNotes: creditNotes ?? [], settings, organization };
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

export async function createCreditNoteDraft({ organizationId, invoiceId, description, amount, reason, issueDate }) {
  const { data, error } = await supabase.rpc('create_credit_note_draft', {
    p_organization_id: organizationId,
    p_invoice_id: invoiceId,
    p_description: description,
    p_amount: Number(amount),
    p_reason: reason,
    p_issue_date: issueDate,
  });
  if (error) throw error;
  return data;
}

export async function issueCreditNote(organizationId, creditNoteId) {
  const { data, error } = await supabase.rpc('issue_credit_note', {
    p_organization_id: organizationId,
    p_credit_note_id: creditNoteId,
  });
  if (error) throw error;
  return data;
}

export function subscribeToFinance(organizationId, refresh) {
  if (!organizationId) return () => {};
  const interval = window.setInterval(refresh, 15000);
  return () => window.clearInterval(interval);
}
