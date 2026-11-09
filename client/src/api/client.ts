/**
 * SecurePulse API Client
 * Wraps native fetch with credentials: 'include', CSRF/Cookie support, and auto-refresh
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || '/api';

interface RequestOptions extends RequestInit {
  retryOn401?: boolean;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { retryOn401 = true, headers = {}, ...rest } = options;

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401 && retryOn401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    // Attempt silent token refresh
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        // Retry original request once
        return apiRequest<T>(endpoint, { ...options, retryOn401: false });
      }
    } catch {
      // Refresh failed, proceed with error
    }
  }

  // Handle CSV or text responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) throw new Error('Failed to download CSV');
    return (await response.text()) as unknown as T;
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = { success: response.ok, message: response.statusText };
  }

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication API
export const authApi = {
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail: (userId: string, otp: string, email?: string) =>
    apiRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ userId, otp, email }) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  verifyLoginOtp: (challengeToken: string, otp: string, trustThisDevice: boolean) =>
    apiRequest('/auth/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, otp, trustThisDevice }),
    }),
  resendOtp: (payload: { challengeToken?: string; userId?: string; email?: string; purpose?: string }) =>
    apiRequest('/auth/resend-otp', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  forgotPassword: (identifier: string) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (body: any) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

// User Profile API
export const userApi = {
  getProfile: () => apiRequest('/users/profile'),
  updateProfile: (body: any) => apiRequest('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  updateTheme: (themePreference: 'auto' | 'light' | 'dark') =>
    apiRequest('/users/theme', { method: 'PUT', body: JSON.stringify({ themePreference }) }),
  updateSecuritySettings: (settings: any) =>
    apiRequest('/users/security-settings', { method: 'PUT', body: JSON.stringify(settings) }),
  deleteAccount: (password: string) =>
    apiRequest('/users/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
};

// Login Activity API
export const activityApi = {
  getHistory: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return apiRequest(`/login-history?${query.toString()}`);
  },
  getById: (id: string) => apiRequest(`/login-history/${id}`),
  exportCsv: async () => {
    const csvData = await apiRequest<string>('/login-history/export');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `securepulse-login-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// Trusted Devices API
export const deviceApi = {
  getDevices: () => apiRequest('/devices'),
  trustCurrentDevice: () => apiRequest('/devices/trust', { method: 'POST' }),
  removeDevice: (id: string) => apiRequest(`/devices/${id}`, { method: 'DELETE' }),
  removeAllDevices: () => apiRequest('/devices', { method: 'DELETE' }),
};

// Active Sessions API
export const sessionApi = {
  getSessions: () => apiRequest('/sessions'),
  terminateSession: (id: string) => apiRequest(`/sessions/${id}`, { method: 'DELETE' }),
  terminateOthers: () => apiRequest('/sessions/others', { method: 'DELETE' }),
  terminateAll: () => apiRequest('/sessions/all', { method: 'DELETE' }),
};

// Security Overview, Alerts & Advanced Intelligence API
export const securityApi = {
  getOverview: () => apiRequest('/security/overview'),
  getAlerts: (unreadOnly = false) => apiRequest(`/security/alerts?unreadOnly=${unreadOnly}`),
  markAlertRead: (id: string) => apiRequest(`/security/alerts/${id}/read`, { method: 'PUT' }),
  markAllAlertsRead: () => apiRequest('/security/alerts/mark-all-read', { method: 'POST' }),
  deleteAlert: (id: string) => apiRequest(`/security/alerts/${id}`, { method: 'DELETE' }),
  clearAllAlerts: () => apiRequest('/security/alerts/clear-all', { method: 'POST' }),
  getAlertPreferences: () => apiRequest('/security/alerts/preferences'),
  updateAlertPreferences: (body: any) =>
    apiRequest('/security/alerts/preferences', { method: 'PUT', body: JSON.stringify(body) }),
  getHealthScore: () => apiRequest('/security/health-score'),
  emergencyLock: (confirmationPhrase: string) =>
    apiRequest('/security/emergency-lock', { method: 'POST', body: JSON.stringify({ confirmationPhrase }) }),
  requestRecovery: (identifier: string) =>
    apiRequest('/security/recover/request', { method: 'POST', body: JSON.stringify({ identifier }) }),
  verifyRecovery: (body: any) =>
    apiRequest('/security/recover/verify', { method: 'POST', body: JSON.stringify(body) }),
  verifyBackupCode: (code: string, identifier?: string, newPassword?: string) =>
    apiRequest('/security/recover/backup-code', { method: 'POST', body: JSON.stringify({ code, identifier, newPassword }) }),

  // FEATURE 1: AI Risk Analysis
  getRiskAnalysis: () => apiRequest('/security/risk-analysis'),

  // FEATURE 2: Impossible Travel
  getImpossibleTravel: () => apiRequest('/security/impossible-travel'),
  resolveImpossibleTravel: (id: string, resolution: 'resolved_user' | 'reported_suspicious') =>
    apiRequest(`/security/impossible-travel/${id}/resolve`, { method: 'PUT', body: JSON.stringify({ resolution }) }),

  // FEATURE 5: Account Takeover (ATO) Protection
  getAccountProtection: () => apiRequest('/security/account-protection'),
  emergencyFreeze: (reason?: string) =>
    apiRequest('/security/account-protection/emergency-freeze', { method: 'POST', body: JSON.stringify({ reason }) }),

  // FEATURE 6: Personal Security Timeline
  getTimeline: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return apiRequest(`/security/timeline?${query.toString()}`);
  },
  exportTimelineCsv: async () => {
    const csvData = await apiRequest<string>('/security/timeline/export?format=csv');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `securepulse-security-timeline-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  exportTimelineJson: async () => {
    const jsonData = await apiRequest<any>('/security/timeline/export?format=json');
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `securepulse-security-timeline-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // FEATURE 7: Emergency Recovery Codes
  getRecoveryCodes: () => apiRequest('/security/recovery/codes'),
  generateRecoveryCodes: () => apiRequest('/security/recovery/codes/generate', { method: 'POST' }),
};

// FEATURE 4: WebAuthn Passkeys API
export const passkeyApi = {
  getAuthOptions: (email?: string) =>
    apiRequest(`/passkeys/auth-options${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  verifyAuth: (response: any) =>
    apiRequest('/passkeys/verify-auth', { method: 'POST', body: JSON.stringify({ response }) }),
  getRegisterOptions: () => apiRequest('/passkeys/register-options'),
  register: (response: any, name?: string) =>
    apiRequest('/passkeys/register', { method: 'POST', body: JSON.stringify({ response, name }) }),
  list: () => apiRequest('/passkeys/list'),
  rename: (id: string, name: string) =>
    apiRequest(`/passkeys/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id: string) => apiRequest(`/passkeys/${id}`, { method: 'DELETE' }),
};

