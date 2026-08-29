import { supabase } from '../config/supabase';

const STATUS_TO_DB = {
  purchased: 'purchased', purchasePaid: 'purchase_paid', atPort: 'at_port',
  loaded: 'loaded', inTransit: 'in_transit', arrived: 'arrived', released: 'released',
};
const STATUS_FROM_DB = Object.fromEntries(Object.entries(STATUS_TO_DB).map(([ui, db]) => [db, ui]));

function splitVehicleName(value = '') {
  const parts = value.trim().split(/\s+/);
  const year = /^\d{4}$/.test(parts[0]) ? parts.shift() : '';
  const make = parts.shift() || '';
  return { year, make, model: parts.join(' '), trim: '' };
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(car) {
  const identity = splitVehicleName(car.yearMakeModel);
  const hasVehicleData = [
    car.yearMakeModel, car.vin, car.owner, car.lotStock, car.buyingLocation,
    car.buyingDate, car.wireDate, car.buyingPrice, car.otherFees,
    car.purchasePaid, car.destination, car.shippingPort, car.containerNumber,
    car.shippingLine, car.inlandPrice, car.oceanPrice, car.shippingPaid,
  ].some((value) => String(value ?? '').trim() !== '');
  return {
    ...car,
    ...identity,
    vin: car.vin?.trim().toUpperCase(),
    purchasePaid: optionalNumber(car.purchasePaid),
    shippingPaid: optionalNumber(car.shippingPaid),
    status: STATUS_TO_DB[car.status] || 'purchased',
    charges: [
      { category: 'purchase', description: 'Vehicle purchase', amount: Number(car.buyingPrice) || 0 },
      { category: 'commission', description: 'Company commission', amount: hasVehicleData ? 100 : 0 },
      { category: 'other_purchase', description: 'Other purchase fees', amount: Number(car.otherFees) || 0 },
      { category: 'inland_shipping', description: 'Inland shipping', amount: Number(car.inlandPrice) || 0 },
      { category: 'ocean_shipping', description: 'Ocean shipping', amount: Number(car.oceanPrice) || 0 },
    ],
  };
}

function isVinUniqueViolation(error) {
  return error?.code === '23505'
    && /vehicles_(organization_id_vin_key|org_complete_vin_uidx)/.test(error.message ?? '');
}

async function loadCars(organizationId) {
  const [vehiclesResult, chargesResult, paymentsResult, containersResult] = await Promise.all([
    supabase.from('vehicles').select('*, clients(name)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('charges').select('vehicle_id, category, amount').eq('organization_id', organizationId),
    supabase.from('payments').select('vehicle_id, type, amount, status').eq('organization_id', organizationId),
    supabase.from('container_vehicles').select('vehicle_id, containers(number, shipping_line, shipping_port, destination, transit_arrival_date, shipping_wire_date)').eq('organization_id', organizationId),
  ]);
  const firstError = [vehiclesResult, chargesResult, paymentsResult, containersResult].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const chargesByVehicle = new Map();
  for (const charge of chargesResult.data) {
    const list = chargesByVehicle.get(charge.vehicle_id) || [];
    list.push(charge);
    chargesByVehicle.set(charge.vehicle_id, list);
  }
  const paymentsByVehicle = new Map();
  for (const payment of paymentsResult.data.filter((item) => item.status === 'posted')) {
    const list = paymentsByVehicle.get(payment.vehicle_id) || [];
    list.push(payment);
    paymentsByVehicle.set(payment.vehicle_id, list);
  }
  const containersByVehicle = new Map(containersResult.data.map((item) => [item.vehicle_id, item.containers]));

  return vehiclesResult.data.map((vehicle) => {
    const charges = chargesByVehicle.get(vehicle.id) || [];
    const payments = paymentsByVehicle.get(vehicle.id) || [];
    const charge = (category) => charges.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.amount), 0);
    const paid = (type) => payments.filter((item) => item.type === type).reduce((sum, item) => sum + Number(item.amount), 0);
    const container = containersByVehicle.get(vehicle.id) || {};
    const purchaseDue = charge('purchase') + charge('commission') + charge('auction_fee') + charge('other_purchase');
    const shippingDue = charge('inland_shipping') + charge('ocean_shipping') + charge('container_shared') + charge('customs') + charge('other_shipping');
    return {
      id: vehicle.id,
      yearMakeModel: [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' '),
      vin: vehicle.vin || '',
      owner: vehicle.clients?.name || '',
      auction: vehicle.auction || 'Other',
      lotStock: vehicle.lot_stock || '',
      buyingLocation: vehicle.buying_location || '',
      buyingDate: vehicle.buying_date || '',
      wireDate: vehicle.purchase_wire_date || '',
      status: STATUS_FROM_DB[vehicle.status] || 'purchased',
      notes: vehicle.notes || '',
      buyingPrice: charge('purchase'), commission: charge('commission'), otherFees: charge('auction_fee') + charge('other_purchase'),
      inlandPrice: charge('inland_shipping'), oceanPrice: charge('ocean_shipping'),
      purchasePaid: paid('purchase'), shippingPaid: paid('shipping'),
      purchaseRemaining: purchaseDue - paid('purchase'), shippingRemaining: shippingDue - paid('shipping'),
      containerNumber: container.number || '', shippingLine: container.shipping_line || '', shippingPort: container.shipping_port || '',
      destination: container.destination || '', transitArrivalDate: container.transit_arrival_date || '', shippingWireDate: container.shipping_wire_date || '',
      createdAt: vehicle.created_at,
    };
  });
}

export async function addCar(organizationId, carData) {
  const { data, error } = await supabase.rpc('save_vehicle_record', { p_organization_id: organizationId, p_vehicle_id: null, p_payload: toPayload(carData) });
  if (error) {
    if (isVinUniqueViolation(error)) throw new Error('VIN_EXISTS');
    if (error.message?.includes('SUBSCRIPTION_BLOCKED:')) throw new Error(error.message.match(/SUBSCRIPTION_BLOCKED:([a-z_]+)/)?.[1] || 'subscription_blocked');
    throw error;
  }
  return data;
}

export async function updateCar(organizationId, id, carData) {
  const { data, error } = await supabase.rpc('save_vehicle_record', { p_organization_id: organizationId, p_vehicle_id: id, p_payload: toPayload(carData) });
  if (error) {
    if (isVinUniqueViolation(error)) throw new Error('VIN_EXISTS');
    if (error.message?.includes('SUBSCRIPTION_BLOCKED:')) throw new Error(error.message.match(/SUBSCRIPTION_BLOCKED:([a-z_]+)/)?.[1] || 'subscription_blocked');
    throw error;
  }
  return data;
}

export async function deleteCar(organizationId, id) {
  const { error } = await supabase.from('vehicles').delete().eq('organization_id', organizationId).eq('id', id);
  if (error) throw error;
}

export async function getCar(organizationId, id) {
  return (await loadCars(organizationId)).find((car) => car.id === id) || null;
}

export function subscribeToCars(organizationId, callback, onError = console.error) {
  let active = true;
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadCars(organizationId).then((cars) => active && callback(cars)).catch(onError), 80);
  };
  refresh();
  const interval = window.setInterval(refresh, 15000);
  return () => { active = false; clearTimeout(timer); window.clearInterval(interval); };
}

export const calcPurchaseSubTotal = (car) => (Number(car.buyingPrice) || 0) + (Number(car.commission) || 0) + (Number(car.otherFees) || 0);
export const calcShippingSubTotal = (car) => (Number(car.inlandPrice) || 0) + (Number(car.oceanPrice) || 0);
export const calcPurchaseRemaining = (car) => car.purchaseRemaining ?? Math.max(0, calcPurchaseSubTotal(car) - (Number(car.purchasePaid) || 0));
export const calcShippingRemaining = (car) => car.shippingRemaining ?? Math.max(0, calcShippingSubTotal(car) - (Number(car.shippingPaid) || 0));
