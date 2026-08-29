import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { neonAuth, supabase } from '../config/supabase';

const AuthContext = createContext(null);
const legacyIdentityTasks = new Map();
const IDENTITY_RETRY_DELAYS_MS = [0, 300, 900];

function appUrl(path = '') {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.origin).toString();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrateLegacyIdentity = async (nextSession) => {
    if (!nextSession?.user) return null;
    const neonUserId = nextSession.user.id;
    let identityTask = legacyIdentityTasks.get(neonUserId);

    if (!identityTask) {
      identityTask = (async () => {
        let lastError;

        for (const delayMs of IDENTITY_RETRY_DELAYS_MS) {
          if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          const { data, error } = await supabase.rpc('ensure_current_user_mapping');
          if (!error) return data;
          lastError = error;
          if (/EMAIL_VERIFICATION_REQUIRED|AUTH_USER_NOT_FOUND/.test(error.message ?? '')) break;
        }

        throw lastError;
      })();
      legacyIdentityTasks.set(neonUserId, identityTask);
      identityTask.catch(() => legacyIdentityTasks.delete(neonUserId));
    }

    const legacyUserId = await identityTask;
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

    // The Neon Supabase adapter emits INITIAL_SESSION when the listener is
    // registered, so a separate getSession() here would duplicate hydration.
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
