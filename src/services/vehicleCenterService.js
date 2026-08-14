import { supabase } from '../config/supabase';

export async function loadVehicleCenterPreferences(organizationId, userId) {
  const [watchlistResult, searchesResult] = await Promise.all([
    supabase
      .from('vehicle_watchlist')
      .select('vehicle_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId),
    supabase
      .from('vehicle_saved_searches')
      .select('id, name, filters, updated_at')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
  ]);
  const error = watchlistResult.error || searchesResult.error;
  if (error) throw error;
  return {
    watchlist: new Set((watchlistResult.data || []).map((item) => item.vehicle_id)),
    savedSearches: searchesResult.data || [],
  };
}

export async function setVehicleWatchlisted(organizationId, userId, vehicleId, watched) {
  if (watched) {
    const { error } = await supabase.from('vehicle_watchlist').upsert({
      organization_id: organizationId,
      user_id: userId,
      vehicle_id: vehicleId,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('vehicle_watchlist')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId);
  if (error) throw error;
}

export async function saveVehicleSearch(organizationId, userId, name, filters) {
  const { data, error } = await supabase
    .from('vehicle_saved_searches')
    .upsert({
      organization_id: organizationId,
      user_id: userId,
      name: name.trim(),
      filters,
    }, { onConflict: 'organization_id,user_id,name' })
    .select('id, name, filters, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVehicleSearch(organizationId, userId, id) {
  const { error } = await supabase
    .from('vehicle_saved_searches')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  if (error) throw error;
}
