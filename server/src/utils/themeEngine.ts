/**
 * SecurePulse Adaptive Theme Engine
 * Evaluates theme according to Indian Standard Time (IST) (UTC+5:30)
 * 5:00 AM to 11:59 AM IST -> Light mode
 * 12:00 PM to 4:59 AM IST -> Dark mode
 */

export interface ThemeCalculationResult {
  theme: 'light' | 'dark';
  preference: 'auto' | 'light' | 'dark';
  isAutoCalculated: boolean;
  istTimeString: string;
  istHour: number;
  istMinute: number;
}

export function calculateThemeForIST(preference: 'auto' | 'light' | 'dark' = 'auto'): ThemeCalculationResult {
  const now = new Date();

  // Convert to Asia/Kolkata timezone
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = istFormatter.formatToParts(now);
  const hourPart = parts.find((p) => p.type === 'hour')?.value;
  const minutePart = parts.find((p) => p.type === 'minute')?.value;

  const istHour = hourPart ? parseInt(hourPart, 10) : 0;
  const istMinute = minutePart ? parseInt(minutePart, 10) : 0;

  // Rule: 5:00 AM to 11:59 AM IST => Light mode
  // 12:00 PM (12) to 4:59 AM (4) IST => Dark mode
  const isMorningSlot = istHour >= 5 && istHour < 12;
  const autoTheme: 'light' | 'dark' = isMorningSlot ? 'light' : 'dark';

  let resolvedTheme: 'light' | 'dark' = autoTheme;
  let isAutoCalculated = true;

  if (preference === 'light') {
    resolvedTheme = 'light';
    isAutoCalculated = false;
  } else if (preference === 'dark') {
    resolvedTheme = 'dark';
    isAutoCalculated = false;
  }

  const istTimeString = `${istHour.toString().padStart(2, '0')}:${istMinute.toString().padStart(2, '0')} IST`;

  return {
    theme: resolvedTheme,
    preference,
    isAutoCalculated,
    istTimeString,
    istHour,
    istMinute,
  };
}

