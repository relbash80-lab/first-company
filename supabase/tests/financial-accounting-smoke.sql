-- Run in a disposable/local Supabase database after all migrations.
-- Structural tests for the operational finance foundation.

begin;

select plan(22);

select has_table('public', 'financial_settings', 'financial settings table exists');
select has_table('public', 'document_sequences', 'document sequences table exists');
select has_table('public', 'invoices', 'invoices table exists');
select has_table('public', 'invoice_items', 'invoice items table exists');
select has_table('public', 'receipts', 'receipts table exists');
select has_table('public', 'receipt_allocations', 'receipt allocations table exists');
select has_table('public', 'credit_notes', 'credit notes table exists');
select has_table('public', 'credit_note_items', 'credit note items table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.invoices'::regclass),
  'invoices RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.invoice_items'::regclass),
  'invoice items RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.receipts'::regclass),
  'receipts RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.receipt_allocations'::regclass),
  'receipt allocations RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.credit_notes'::regclass),
  'credit notes RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.credit_note_items'::regclass),
  'credit note items RLS is enabled'
);

select has_view('public', 'invoice_financial_summary', 'invoice financial summary view exists');
select has_view('public', 'receipt_financial_summary', 'receipt financial summary view exists');
select has_view('public', 'client_financial_summary', 'client financial summary view exists');
select has_view('public', 'unbilled_charges', 'unbilled charges view exists');

select has_function(
  'public',
  'create_invoice_draft',
  array['uuid','uuid','uuid[]','text','date','date','text','text'],
  'invoice draft function exists'
);
select has_function(
  'public',
  'issue_invoice',
  array['uuid','uuid','numeric','numeric'],
  'invoice issue function exists'
);
select has_function(
  'public',
  'record_receipt',
  array['uuid','uuid','numeric','text','date','receipt_method','text','text'],
  'receipt recording function exists'
);
select has_function(
  'public',
  'allocate_receipt',
  array['uuid','uuid','uuid','numeric'],
  'receipt allocation function exists'
);

select * from finish();
rollback;
