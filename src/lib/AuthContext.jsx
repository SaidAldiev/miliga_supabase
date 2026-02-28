import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, supabase } from '@/api/supabaseClient';

/**
 * AuthContext
 *
 * Replaces Base44 authentication with Supabase Auth.
 * - Tracks Supabase session changes.
 * - Exposes an app-level user object from api.auth.me() (auth user + profiles row).
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    /**
     * IMPORTANT (Supabase Auth lock):
     * Do NOT make awaited Supabase calls inside `onAuthStateChange`.
     * Supabase uses an internal async lock (navigator.locks). Awaiting inside
     * the callback can cause deadlocks / "The provided callback is no longer runnable".
     *
     * Workaround: keep the callback synchronous and do async work AFTER it returns
     * (e.g. setTimeout(..., 0)).
     */
    const hydrateAppUser = async () => {
      // Hydrate app-level user object (includes profiles fields)
      const me = await api.auth.me();
      return me;
    };

    const bootstrap = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (!session?.user) {
          if (!isMounted) return;
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const me = await hydrateAppUser();
        if (!isMounted) return;
        setUser(me);
        setIsAuthenticated(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth bootstrap failed:', e);
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } finally {
        // Always end loading, even if Supabase throws.
        if (isMounted) setIsLoadingAuth(false);
      }
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep this callback synchronous.
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        setIsLoadingAuth(false);
        return;
      }

      // Session exists: mark as authenticated immediately.
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(true);

      // Defer async calls until AFTER the callback returns to avoid Supabase lock issues.
      setTimeout(() => {
        (async () => {
          try {
            const me = await hydrateAppUser();
            if (!isMounted) return;
            setUser(me);
            setIsAuthenticated(true);
            setAuthError(null);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Auth state change hydration failed:', e);
            if (!isMounted) return;
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } finally {
            if (isMounted) setIsLoadingAuth(false);
          }
        })();
      }, 0);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    // If redirect is desired, send user to login screen.
    if (shouldRedirect) {
      api.auth.logout('/login');
    } else {
      api.auth.logout();
    }
  };

  const navigateToLogin = () => {
    api.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoadingAuth,
        authError,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};