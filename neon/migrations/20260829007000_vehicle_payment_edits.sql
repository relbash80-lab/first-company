begin;

-- Keep the existing vehicle/charge implementation intact and wrap it with an
-- atomic payment-total synchronizer. The form edits a total paid amount, while
-- the payments table remains an auditable ledger: previous form-managed rows
-- are voided and a replacement balance row is posted.
alter function public.save_vehicle_record(uuid, uuid, jsonb)
  rename to save_vehicle_record_core_20260829;

revoke all on function public.save_vehicle_record_core_20260829(uuid, uuid, jsonb)
  from public, anonymous, authenticated;

create function public.save_vehicle_record(
  p_organization_id uuid,
  p_vehicle_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_vehicle_id uuid;
  payment_edit record;
  requested_total numeric;
  current_total numeric;
  immutable_total numeric;
  replacement_amount numeric;
  current_actor uuid := app_auth.uid();
begin
  result_vehicle_id := public.save_vehicle_record_core_20260829(
    p_organization_id,
    p_vehicle_id,
    p_payload
  );

  for payment_edit in
    select
      'purchase'::public.payment_type as payment_type,
      'purchasePaid'::text as payload_key
    union all
    select
      'shipping'::public.payment_type,
      'shippingPaid'::text
  loop
    -- Older callers may omit a payment field. Omission means "leave it as-is";
    -- an explicit null/empty value from the vehicle form means a total of zero.
    if not (p_payload ? payment_edit.payload_key) then
      continue;
    end if;

    requested_total := coalesce(
      nullif(trim(p_payload->>payment_edit.payload_key), '')::numeric,
      0
    );

    if requested_total < 0 then
      raise exception 'PAYMENT_TOTAL_NEGATIVE:%', payment_edit.payment_type;
    end if;

    select coalesce(sum(p.amount), 0)
    into current_total
    from public.payments p
    where p.organization_id = p_organization_id
      and p.vehicle_id = result_vehicle_id
      and p.type = payment_edit.payment_type
      and p.status = 'posted';

    if current_total = requested_total then
      continue;
    end if;

    -- Payments created outside the vehicle form are immutable here. This
    -- prevents a form edit from erasing a real receipt/accounting transaction.
    select coalesce(sum(p.amount), 0)
    into immutable_total
    from public.payments p
    where p.organization_id = p_organization_id
      and p.vehicle_id = result_vehicle_id
      and p.type = payment_edit.payment_type
      and p.status = 'posted'
      and coalesce(p.reference, '') not in ('opening-entry', 'vehicle-form-balance');

    if requested_total < immutable_total then
      raise exception 'PAYMENT_TOTAL_BELOW_POSTED:%:%',
        payment_edit.payment_type,
        immutable_total;
    end if;

    update public.payments
    set
      status = 'voided',
      voided_at = now(),
      voided_by = current_actor,
      void_reason = 'Replaced by vehicle form correction',
      updated_at = now()
    where organization_id = p_organization_id
      and vehicle_id = result_vehicle_id
      and type = payment_edit.payment_type
      and status = 'posted'
      and reference in ('opening-entry', 'vehicle-form-balance');

    replacement_amount := requested_total - immutable_total;

    if replacement_amount > 0 then
      insert into public.payments (
        organization_id,
        vehicle_id,
        type,
        amount,
        reference,
        notes,
        created_by
      ) values (
        p_organization_id,
        result_vehicle_id,
        payment_edit.payment_type,
        replacement_amount,
        'vehicle-form-balance',
        'Corrected total entered from the vehicle form',
        current_actor
      );
    end if;
  end loop;

  return result_vehicle_id;
end;
$$;

revoke all on function public.save_vehicle_record(uuid, uuid, jsonb) from public;
grant execute on function public.save_vehicle_record(uuid, uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
