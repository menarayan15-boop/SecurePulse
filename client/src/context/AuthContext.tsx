import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser } from '../types';
import { userApi, authApi } from '../api/client';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginSuccess: (userData: IUser) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (updated: Partial<IUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { applyUserPreference } = useTheme();

  const refreshProfile = useCallback(async () => {
    try {
      const res = await userApi.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
        if (res.user.themePreference) {
          applyUserPreference(res.user.themePreference);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyUserPreference]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginSuccess = (userData: IUser) => {
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

