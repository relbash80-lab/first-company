import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user } = useAuth();
  const [membership, setMembership] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshOrganization = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const [membershipResult, platformAdminResult] = await Promise.all([
      supabase
        .from('organization_members')
        .select('organization_id, role, organizations(id, name, slug, default_currency)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]);

    const queryError = membershipResult.error || platformAdminResult.error;
    if (queryError) setError(queryError);
    setMembership(membershipResult.data ?? null);
    setIsPlatformAdmin(Boolean(platformAdminResult.data));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshOrganization();
  }, [refreshOrganization]);

  const createOrganization = useCallback(async ({ name, slug, currency = 'USD' }) => {
    const { data, error: rpcError } = await supabase.rpc('create_organization', {
      organization_name: name,
      organization_slug: slug,
      currency_code: currency,
    });
    if (rpcError) throw rpcError;
    await refreshOrganization();
    return data;
  }, [refreshOrganization]);

  const value = useMemo(() => ({
    membership,
    organization: membership?.organizations ?? null,
    role: membership?.role ?? null,
    isPlatformAdmin,
    organizationId: membership?.organization_id ?? null,
    loading,
    error,
    createOrganization,
    refreshOrganization,
  }), [createOrganization, error, isPlatformAdmin, loading, membership, refreshOrganization]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within OrganizationProvider');
  return context;
}
