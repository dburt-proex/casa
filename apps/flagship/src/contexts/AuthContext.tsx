import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const clerkAuth = useClerkAuth();
  const clerkUser = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
    if (!clerkConfigured || !clerkAuth.isSignedIn || !clerkUser.user) return;

    const syncClerkSession = async () => {
      const clerkToken = await clerkAuth.getToken();
      if (!clerkToken) return;

      const role = clerkUser.user.publicMetadata?.role === 'admin' ? 'admin' : 'operator';
      const email = clerkUser.user.primaryEmailAddress?.emailAddress || clerkUser.user.username || clerkUser.user.id;
      setToken(clerkToken);
      setUser({ email, role });
    };

    void syncClerkSession();
  }, [clerkAuth, clerkConfigured, clerkUser.user]);

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
      isAuthenticated: !!token,
      isAdmin: user?.role === 'admin'
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
