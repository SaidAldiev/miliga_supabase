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

    const bootstrap = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);

      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user) {
          if (!isMounted) return;
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          return;
        }

        // Hydrate app-level user object (includes profiles fields)
        const me = await api.auth.me();
        if (!isMounted) return;
        setUser(me);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth bootstrap failed:', e);
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        setIsLoadingAuth(false);
      }
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!session?.user) {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }
        setIsLoadingAuth(true);
        const me = await api.auth.me();
        setUser(me);
        setIsAuthenticated(true);
        setAuthError(null);
        setIsLoadingAuth(false);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth state change handler failed:', e);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        setIsLoadingAuth(false);
      }
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
