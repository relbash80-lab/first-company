-- Prevent an issued credit note from exceeding the invoice's actual open balance.
-- The open balance accounts for both posted receipt allocations and earlier issued credits.

create or replace function public.issue_credit_note(
  p_organization_id uuid,
  p_credit_note_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_note public.credit_notes%rowtype;
  target_invoice public.invoices%rowtype;
  calculated_total numeric(14,2);
  previous_credits numeric(14,2);
  allocated_total numeric(14,2);
  assigned_number text;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager']::public.organization_role[]
  ) then raise exception 'Only an owner or manager can issue credit notes'; end if;

  select * into target_note from public.credit_notes
  where organization_id = p_organization_id and id = p_credit_note_id
  for update;
  if not found then raise exception 'Credit note not found'; end if;
  if target_note.status <> 'draft' then raise exception 'Only draft credit notes can be issued'; end if;

  select * into target_invoice from public.invoices
  where organization_id = p_organization_id and id = target_note.invoice_id
  for update;
  if not found or target_invoice.status in ('draft', 'voided') then raise exception 'Issued invoice not found'; end if;

  select coalesce(sum(amount), 0)::numeric(14,2) into calculated_total
  from public.credit_note_items
  where organization_id = p_organization_id and credit_note_id = p_credit_note_id;
  if calculated_total <= 0 then raise exception 'Credit note must contain items'; end if;

  select coalesce(sum(total), 0)::numeric(14,2) into previous_credits
  from public.credit_notes
  where invoice_id = target_note.invoice_id and status = 'issued';

  select coalesce(sum(amount), 0)::numeric(14,2) into allocated_total
  from public.receipt_allocations
  where invoice_id = target_note.invoice_id and reversed_at is null;

  if allocated_total + previous_credits + calculated_total > target_invoice.grand_total then
    raise exception 'Credit note cannot exceed the invoice open balance';
  end if;

  assigned_number := public.next_financial_document_number(
    p_organization_id, 'credit_note', target_note.issue_date
  );
  update public.credit_notes set
    credit_note_number = assigned_number,
    total = calculated_total,
    status = 'issued',
    issued_at = now(),
    issued_by = auth.uid()
  where id = p_credit_note_id;

  perform public.refresh_invoice_status(target_note.invoice_id);
  return assigned_number;
end;
$$;

revoke all on function public.issue_credit_note(uuid, uuid) from public;
grant execute on function public.issue_credit_note(uuid, uuid) to authenticated;
