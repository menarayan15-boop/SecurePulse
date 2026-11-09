import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser } from '../types';
import { userApi, authApi, setAccessToken, resetRefreshFailure } from '../api/client';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginSuccess: (userData: IUser, token?: string) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (updated: Partial<IUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HAS_SESSION_KEY = 'sp_has_session';

function hasSessionIndicator(): boolean {
  try {
    return (
      document.cookie.includes(`${HAS_SESSION_KEY}=1`) ||
      sessionStorage.getItem(HAS_SESSION_KEY) === '1'
    );
  } catch {
    return false;
  }
}

function setSessionIndicator(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(HAS_SESSION_KEY, '1');
      document.cookie = `${HAS_SESSION_KEY}=1; path=/; max-age=604800; SameSite=Lax`;
    } else {
      sessionStorage.removeItem(HAS_SESSION_KEY);
      document.cookie = `${HAS_SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { applyUserPreference } = useTheme();

  const refreshProfile = useCallback(async () => {
    const path = window.location.pathname;
    const isPublicPath = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/recover-account'].includes(path);

    // If there is no indication of an active session and the visitor is on a public page,
    // do not fire speculative requests that would produce 401 in network logs.
    if (!hasSessionIndicator() && isPublicPath && !user) {
      setLoading(false);
      return;
    }

    try {
      const res = await userApi.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
        setSessionIndicator(true);
        if (res.user.themePreference) {
          applyUserPreference(res.user.themePreference);
        }
      } else {
        if (!user) {
          setUser(null);
          setSessionIndicator(false);
        }
      }
    } catch (err: any) {
      if (err?.status === 401) {
        setSessionIndicator(false);
        setAccessToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [applyUserPreference, user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginSuccess = (userData: IUser, token?: string) => {
    if (token) {
      setAccessToken(token);
    }
    setSessionIndicator(true);
    resetRefreshFailure();
    setUser(userData);
    if (userData.themePreference) {
      applyUserPreference(userData.themePreference);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Fallback
    } finally {
      setAccessToken(null);
      setSessionIndicator(false);
      resetRefreshFailure();
      setUser(null);
      window.location.href = '/';
    }
  };

  const updateUser = (updated: Partial<IUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        loginSuccess,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


