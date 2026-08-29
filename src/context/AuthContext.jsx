import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { neonAuth, supabase } from '../config/supabase';
import { IDLE_LOGOUT_NOTICE_KEY, idleTimeRemaining } from '../utils/sessionIdle';

const AuthContext = createContext(null);
const legacyIdentityTasks = new Map();
const IDENTITY_RETRY_DELAYS_MS = [0, 300, 900];
const ACTIVITY_WRITE_INTERVAL_MS = 1000;
const LAST_ACTIVITY_KEY = 'first-company-last-activity';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'];

function appUrl(path = '') {
  return new URL(`${import.meta.env.BASE_URL}${path}`, window.location.origin).toString();
}

function readLastActivity() {
  const value = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function writeLastActivity(timestamp = Date.now()) {
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  return timestamp;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);
  const logoutRunningRef = useRef(false);

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

  const signOut = useCallback(async ({ idle = false } = {}) => {
    if (logoutRunningRef.current) return;
    logoutRunningRef.current = true;

    if (idle) {
      window.sessionStorage.setItem(IDLE_LOGOUT_NOTICE_KEY, '1');
      setSession(null);
    } else {
      window.sessionStorage.removeItem(IDLE_LOGOUT_NOTICE_KEY);
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch (error) {
      if (!idle) throw error;
      console.error('Unable to close inactive session', error);
    } finally {
      logoutRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      return undefined;
    }

    let disposed = false;
    let lastActivityWrite = 0;

    const checkForExpiry = () => {
      if (disposed || logoutRunningRef.current) return;
      const lastActivity = readLastActivity() ?? writeLastActivity();
      const remaining = idleTimeRemaining(lastActivity);

      if (remaining === 0) {
        void signOut({ idle: true });
        return;
      }

      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(checkForExpiry, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      const lastActivity = readLastActivity();

      // A throttled or background tab may wake after the deadline. Check the
      // old deadline before accepting the returning click/focus as activity.
      if (lastActivity && idleTimeRemaining(lastActivity, now) === 0) {
        checkForExpiry();
        return;
      }

      if (now - lastActivityWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
      lastActivityWrite = writeLastActivity(now);
      checkForExpiry();
    };

    const onStorage = (event) => {
      if (event.key === LAST_ACTIVITY_KEY) checkForExpiry();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };

    if (!readLastActivity()) writeLastActivity();
    checkForExpiry();
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener('focus', recordActivity);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener('focus', recordActivity);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session?.user?.id, signOut]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const hydratedSession = await hydrateLegacyIdentity(data.session);
      writeLastActivity();
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
      if (hydratedSession) writeLastActivity();
      setSession(hydratedSession);
      return { ...data, session: hydratedSession, user: hydratedSession?.user ?? null };
    },
    async logout() {
      await signOut();
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
  }), [loading, session, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
