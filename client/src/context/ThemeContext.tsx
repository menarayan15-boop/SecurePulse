import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { userApi } from '../api/client';

type ThemeMode = 'light' | 'dark';
type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  preference: ThemePreference;
  istTime: string;
  isAutoCalculated: boolean;
  setPreference: (pref: ThemePreference) => Promise<void>;
  applyUserPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function calculateLocalIST(pref: ThemePreference): { theme: ThemeMode; isAuto: boolean; istTime: string } {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = istFormatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const istTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} IST`;

  // 5:00 AM to 11:59 AM IST -> Light
  // 12:00 PM to 4:59 AM IST -> Dark
  const isMorningSlot = hour >= 5 && hour < 12;
  const autoTheme: ThemeMode = isMorningSlot ? 'light' : 'dark';

  if (pref === 'light') return { theme: 'light', isAuto: false, istTime };
  if (pref === 'dark') return { theme: 'dark', isAuto: false, istTime };
  return { theme: autoTheme, isAuto: true, istTime };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    return (localStorage.getItem('securepulse_theme_pref') as ThemePreference) || 'auto';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = calculateLocalIST(
      (localStorage.getItem('securepulse_theme_pref') as ThemePreference) || 'auto'
    );
    return initial.theme;
  });

  const [istTime, setIstTime] = useState<string>('IST');
  const [isAutoCalculated, setIsAutoCalculated] = useState<boolean>(true);

  // Sync theme with DOM document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Recalculate and poll server time / IST interval
  useEffect(() => {
    const updateTheme = async () => {
      try {
        const res = await fetch(`/api/theme-info?preference=${preference}`);
        if (res.ok) {
          const data = await res.json();
          setTheme(data.theme);
          setIstTime(data.istTimeString);
          setIsAutoCalculated(data.isAutoCalculated);
          return;
        }
      } catch {
        // Fallback to local timezone conversion
      }

      const localCalc = calculateLocalIST(preference);
      setTheme(localCalc.theme);
      setIstTime(localCalc.istTime);
      setIsAutoCalculated(localCalc.isAuto);
    };

    updateTheme();
    const interval = setInterval(updateTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [preference]);

  const setPreference = useCallback(async (newPref: ThemePreference) => {
    setPreferenceState(newPref);
    localStorage.setItem('securepulse_theme_pref', newPref);

    const calc = calculateLocalIST(newPref);
    setTheme(calc.theme);
    setIsAutoCalculated(calc.isAuto);

    // Save to user profile in DB if authenticated
    try {
      await userApi.updateTheme(newPref);
    } catch {
      // Ignored if not yet logged in
    }
  }, []);

  const applyUserPreference = useCallback((pref: ThemePreference) => {
    if (pref) {
      setPreferenceState(pref);
      localStorage.setItem('securepulse_theme_pref', pref);
      const calc = calculateLocalIST(pref);
      setTheme(calc.theme);
      setIsAutoCalculated(calc.isAuto);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      preference,
      istTime,
      isAutoCalculated,
      setPreference,
      applyUserPreference,
    }),
    [theme, preference, istTime, isAutoCalculated, setPreference, applyUserPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

