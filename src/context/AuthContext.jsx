import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { neonAuth, supabase } from '../config/supabase';

const AuthContext = createContext(null);

function appUrl(path = '') {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.origin).toString();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateLegacyIdentity = async (nextSession) => {
    if (!nextSession?.user) return null;
    const { data: legacyUserId, error } = await supabase.rpc('ensure_current_user_mapping');
    if (error) throw error;
    if (!legacyUserId) throw new Error('Unable to link the authenticated user to an application profile.');
    return {
      ...nextSession,
      user: {
        ...nextSession.user,
        neonId: nextSession.user.id,
        id: legacyUserId,
      },
    };
  };

  useEffect(() => {
    let mounted = true;

    const syncSession = async (nextSession) => {
      try {
        const hydratedSession = await hydrateLegacyIdentity(nextSession);
        if (mounted) setSession(hydratedSession);
      } catch (error) {
        console.error('Unable to prepare Neon session', error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Unable to restore Neon session', error);
        setLoading(false);
        return;
      }
      syncSession(data?.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const hydratedSession = await hydrateLegacyIdentity(data.session);
      setSession(hydratedSession);
      return { ...data, session: hydratedSession, user: hydratedSession?.user ?? null };
    },
    async signup(email, password, displayName) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { displayName: displayName?.trim() || email.split('@')[0] },
          emailRedirectTo: appUrl('login'),
        },
      });
      if (error) throw error;
      const hydratedSession = await hydrateLegacyIdentity(data.session);
      setSession(hydratedSession);
      return { ...data, session: hydratedSession, user: hydratedSession?.user ?? null };
    },
    async logout() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: appUrl('login'),
      });
      if (error) throw error;
    },
    async completePasswordReset(token, password) {
      const { data, error } = await neonAuth.resetPassword({ token, newPassword: password });
      if (error) throw error;
      return data;
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
