import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';

interface User {
  email: string;
  role: string;
  provider?: 'clerk' | 'dev';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchServerUser(token: string): Promise<User | null> {
  try {
    const response = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      email: data.email || data.sub || 'authenticated-user',
      role: data.role === 'admin' ? 'admin' : 'operator',
      provider: data.provider === 'dev' ? 'dev' : 'clerk',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const clerkAuth = useClerkAuth();
  const clerkUser = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSyncingClerk, setIsSyncingClerk] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const clerkEmail = clerkUser.user?.primaryEmailAddress?.emailAddress || clerkUser.user?.username || clerkUser.user?.id;
  const clerkRole = clerkUser.user?.publicMetadata?.role === 'admin' ? 'admin' : 'operator';

  useEffect(() => {
    if (clerkConfigured) return;

    const storedToken = localStorage.getItem('casa_token');
    const storedUser = localStorage.getItem('casa_user');

    if (storedToken && storedUser) {
      try {
        const payloadBase64 = storedToken.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          localStorage.removeItem('casa_token');
          localStorage.removeItem('casa_user');
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        localStorage.removeItem('casa_token');
        localStorage.removeItem('casa_user');
      }
    }
  }, [clerkConfigured]);

  useEffect(() => {
    if (!clerkConfigured) return;

    if (!clerkAuth.isLoaded || !clerkUser.isLoaded) {
      setIsSyncingClerk(true);
      return;
    }

    if (!clerkAuth.isSignedIn || !clerkUser.user) {
      setToken(null);
      setUser(null);
      setIsSyncingClerk(false);
      setAuthError(null);
      return;
    }

    let cancelled = false;
    const syncClerkSession = async () => {
      setIsSyncingClerk(true);
      setAuthError(null);
      try {
        const clerkToken = await clerkAuth.getToken();
        if (!clerkToken) {
          throw new Error('Missing Clerk session token');
        }
        const serverUser = await fetchServerUser(clerkToken);
        if (cancelled) return;

        setToken((current) => current === clerkToken ? current : clerkToken);
        setUser((current) => {
          const nextUser = serverUser || { email: clerkEmail || clerkUser.user!.id, role: clerkRole, provider: 'clerk' as const };
          if (current?.email === nextUser.email && current.role === nextUser.role && current.provider === nextUser.provider) return current;
          return nextUser;
        });
      } catch (error) {
        if (cancelled) return;
        console.error('[Auth] Failed to finish Clerk session sync:', error);
        setToken(null);
        setUser(null);
        setAuthError('Sign-in completed, but CASA could not finish session verification. Please refresh or sign out and sign in again.');
      } finally {
        if (!cancelled) {
          setIsSyncingClerk(false);
        }
      }
    };

    void syncClerkSession();

    return () => {
      cancelled = true;
    };
  }, [
    clerkAuth.getToken,
    clerkAuth.isLoaded,
    clerkAuth.isSignedIn,
    clerkConfigured,
    clerkEmail,
    clerkRole,
    clerkUser.isLoaded,
    clerkUser.user?.id
  ]);

  const login = async (role: string = 'operator') => {
    if (clerkConfigured) return;

    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: `dev-${role}@casa.local` })
      });

      if (!res.ok) throw new Error('Login failed');

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('casa_token', data.token);
      localStorage.setItem('casa_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = () => {
    if (clerkConfigured) {
      void clerkAuth.signOut();
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('casa_token');
    localStorage.removeItem('casa_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: clerkConfigured ? Boolean(clerkAuth.isSignedIn && token && user) : !!token,
      isAdmin: user?.role === 'admin',
      isAuthLoading: clerkConfigured ? (!clerkAuth.isLoaded || !clerkUser.isLoaded || Boolean(clerkAuth.isSignedIn && isSyncingClerk && !token)) : false,
      authError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
