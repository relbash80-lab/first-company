begin;

-- A vehicle can be opened as an incomplete record and completed later.  VIN
-- uniqueness is enforced only once the standard 17-character VIN is present;
-- short work-in-progress values may coexist while users gather the details.
alter table public.vehicles alter column vin drop not null;
update public.vehicles set vin = null where trim(coalesce(vin, '')) = '';
alter table public.vehicles drop constraint if exists vehicles_organization_id_vin_key;
alter table public.vehicles drop constraint if exists vehicles_vin_max_length_check;
alter table public.vehicles
  add constraint vehicles_vin_max_length_check
  check (vin is null or char_length(trim(vin)) between 1 and 17);

create unique index if not exists vehicles_org_complete_vin_uidx
  on public.vehicles (organization_id, upper(trim(vin)))
  where vin is not null and char_length(trim(vin)) = 17;

create or replace function public.save_vehicle_record(
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
  result_client_id uuid;
  result_container_id uuid;
  client_name text := nullif(trim(p_payload->>'owner'), '');
  container_number text := nullif(trim(p_payload->>'containerNumber'), '');
  requested_status public.vehicle_status := coalesce(nullif(p_payload->>'status', '')::public.vehicle_status, 'purchased');
  existing_status public.vehicle_status;
  entitlement record;
  item jsonb;
begin
  if not public.has_organization_role(
    p_organization_id,
    array['owner','manager','buyer','shipping_officer','accountant']::public.organization_role[]
  ) then raise exception 'Not authorized for this organization'; end if;

  if p_vehicle_id is not null then
    select status into existing_status from public.vehicles
    where id = p_vehicle_id and organization_id = p_organization_id for update;
    if not found then raise exception 'Vehicle not found'; end if;
  end if;

  if p_vehicle_id is null or (existing_status = 'released' and requested_status <> 'released') then
    perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':active_vehicle_limit', 0));
    select * into entitlement from public.subscription_entitlement(p_organization_id);
    if not found or entitlement.can_create_vehicle is not true then
      raise exception 'SUBSCRIPTION_BLOCKED:%', coalesce(entitlement.reason, 'subscription_missing');
    end if;
  end if;

  if client_name is not null then
    select id into result_client_id from public.clients
    where organization_id = p_organization_id and lower(name) = lower(client_name)
    order by created_at limit 1;
    if result_client_id is null then
      insert into public.clients (organization_id, name) values (p_organization_id, client_name)
      returning id into result_client_id;
    end if;
  end if;

  if p_vehicle_id is null then
    insert into public.vehicles (
      organization_id, client_id, vin, year, make, model, trim, auction,
      lot_stock, buying_location, buying_date, purchase_wire_date, status, notes
    ) values (
      p_organization_id, result_client_id, nullif(upper(trim(p_payload->>'vin')), ''),
      nullif(p_payload->>'year', '')::smallint, nullif(trim(p_payload->>'make'), ''),
      nullif(trim(p_payload->>'model'), ''), nullif(trim(p_payload->>'trim'), ''),
      coalesce(nullif(p_payload->>'auction', ''), 'Other'), nullif(trim(p_payload->>'lotStock'), ''),
      nullif(trim(p_payload->>'buyingLocation'), ''), nullif(p_payload->>'buyingDate', '')::date,
      nullif(p_payload->>'wireDate', '')::date, requested_status, nullif(trim(p_payload->>'notes'), '')
    ) returning id into result_vehicle_id;
  else
    update public.vehicles set
      client_id = result_client_id,
      vin = nullif(upper(trim(p_payload->>'vin')), ''),
      year = nullif(p_payload->>'year', '')::smallint,
      make = nullif(trim(p_payload->>'make'), ''), model = nullif(trim(p_payload->>'model'), ''),
      trim = nullif(trim(p_payload->>'trim'), ''), auction = coalesce(nullif(p_payload->>'auction', ''), 'Other'),
      lot_stock = nullif(trim(p_payload->>'lotStock'), ''), buying_location = nullif(trim(p_payload->>'buyingLocation'), ''),
      buying_date = nullif(p_payload->>'buyingDate', '')::date, purchase_wire_date = nullif(p_payload->>'wireDate', '')::date,
      status = requested_status, notes = nullif(trim(p_payload->>'notes'), ''), updated_at = now()
    where id = p_vehicle_id and organization_id = p_organization_id
    returning id into result_vehicle_id;
  end if;

  delete from public.charges
  where organization_id = p_organization_id and vehicle_id = result_vehicle_id and source = 'vehicle_form';

  for item in select value from jsonb_array_elements(coalesce(p_payload->'charges', '[]'::jsonb)) loop
    if coalesce((item->>'amount')::numeric, 0) > 0 then
      insert into public.charges (organization_id, vehicle_id, category, description, amount, source)
      values (p_organization_id, result_vehicle_id, (item->>'category')::public.charge_category, nullif(item->>'description', ''), (item->>'amount')::numeric, 'vehicle_form');
    end if;
  end loop;

  delete from public.container_vehicles
  where organization_id = p_organization_id and vehicle_id = result_vehicle_id;

  if container_number is not null then
    insert into public.containers (
      organization_id, number, shipping_line, shipping_port, destination,
      transit_arrival_date, shipping_wire_date
    ) values (
      p_organization_id, upper(container_number), nullif(trim(p_payload->>'shippingLine'), ''),
      nullif(trim(p_payload->>'shippingPort'), ''), nullif(trim(p_payload->>'destination'), ''),
      nullif(p_payload->>'transitArrivalDate', '')::date, nullif(p_payload->>'shippingWireDate', '')::date
    ) on conflict (organization_id, number) do update set
      shipping_line = excluded.shipping_line,
      shipping_port = excluded.shipping_port,
      destination = excluded.destination,
      transit_arrival_date = excluded.transit_arrival_date,
      shipping_wire_date = excluded.shipping_wire_date,
      updated_at = now()
    returning id into result_container_id;

    insert into public.container_vehicles (organization_id, container_id, vehicle_id)
    values (p_organization_id, result_container_id, result_vehicle_id);
  end if;

  if p_vehicle_id is null then
    if coalesce((p_payload->>'purchasePaid')::numeric, 0) > 0 then
      insert into public.payments (organization_id, vehicle_id, type, amount, reference, notes)
      values (p_organization_id, result_vehicle_id, 'purchase', (p_payload->>'purchasePaid')::numeric, 'opening-entry', 'Initial amount entered while creating the vehicle');
    end if;
    if coalesce((p_payload->>'shippingPaid')::numeric, 0) > 0 then
      insert into public.payments (organization_id, vehicle_id, type, amount, reference, notes)
      values (p_organization_id, result_vehicle_id, 'shipping', (p_payload->>'shippingPaid')::numeric, 'opening-entry', 'Initial amount entered while creating the vehicle');
    end if;
  end if;

  return result_vehicle_id;
end;
$$;

revoke all on function public.save_vehicle_record(uuid, uuid, jsonb) from public;
grant execute on function public.save_vehicle_record(uuid, uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
