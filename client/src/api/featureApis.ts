/**
 * SecurePulse Feature APIs
 * Clean, independent API client wrapping the core apiRequest.
 * Protects core authentication files by isolating all feature endpoints.
 */

import { apiRequest } from './client';

// Client-side in-memory cache and in-flight deduplication for instant tab navigation
const clientApiCache = new Map<string, { timestamp: number; data: any }>();
const inFlightClientRequests = new Map<string, Promise<any>>();
const CLIENT_CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateFeatureCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    clientApiCache.clear();
    return;
  }
  for (const key of clientApiCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      clientApiCache.delete(key);
    }
  }
}

async function cachedGetRequest<T>(endpoint: string, ttlMs = CLIENT_CACHE_TTL_MS): Promise<T> {
  const cached = clientApiCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const existing = inFlightClientRequests.get(endpoint);
  if (existing) {
    return existing as Promise<T>;
  }

  const reqPromise = apiRequest<T>(endpoint)
    .then((res) => {
      clientApiCache.set(endpoint, { timestamp: Date.now(), data: res });
      return res;
    })
    .finally(() => {
      inFlightClientRequests.delete(endpoint);
    });

  inFlightClientRequests.set(endpoint, reqPromise);
  return reqPromise;
}

// 1. Feature 1: AI Security Assistant API
export const securityAssistantApi = {
  chat: (message: string) =>
    apiRequest<{
      success: boolean;
      reply: string;
      contextSummary?: {
        recentLoginsAnalyzed: number;
        activeAlertsAnalyzed: number;
        activeSessionsCount: number;
      };
    }>('/security-assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getContext: () =>
    cachedGetRequest<{
      success: boolean;
      summary: {
        unreadAlerts: number;
        activeSessions: number;
        trustedDevices: number;
        status: string;
        engineVersion: string;
      };
    }>('/security-assistant/context'),
};

// 2. Feature 2: Phishing Detector API
export interface IPhishingScanResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  targetSummary: string;
  threatIndicators: string[];
  recommendations: string[];
  details: Record<string, any>;
}

export const phishingApi = {
  scanUrl: async (url: string) => {
    const res = await apiRequest<{ success: boolean; analysis: IPhishingScanResult }>('/phishing/scan-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    invalidateFeatureCache('/phishing/history');
    return res;
  },

  scanContent: async (content: string, type: 'email' | 'message' = 'email') => {
    const res = await apiRequest<{ success: boolean; analysis: IPhishingScanResult }>('/phishing/scan-content', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
    invalidateFeatureCache('/phishing/history');
    return res;
  },

  getHistory: () =>
    cachedGetRequest<{
      success: boolean;
      scans: Array<{
        _id: string;
        scanType: 'url' | 'email' | 'message';
        targetSummary: string;
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        threatIndicators: string[];
        recommendations: string[];
        createdAt: string;
      }>;
    }>('/phishing/history'),
};

// 3. Feature 3: Password Health Monitor API
export const passwordHealthApi = {
  getAccountSummary: () =>
    cachedGetRequest<{
      success: boolean;
      summary: {
        daysSinceLastUpdate: number;
        preferredAuthMethod: string;
        hasPasskeys: boolean;
        passkeysCount: number;
        hasEmailVerified: boolean;
        securityScoreBonus: number;
        recommendations: string[];
      };
    }>('/password-health/account-summary'),
};

// 4. Feature 4: Privacy Control Center API
export const privacyApi = {
  getOverview: () =>
    cachedGetRequest<{
      success: boolean;
      dataInventory: {
        identity: {
          fullName: string;
          username: string;
          email: string;
          mobileNumber: string;
          accountCreated: string;
          accountStatus: string;
        };
        telemetry: {
          totalStoredLogins: number;
          registeredDevices: number;
          historicalAlerts: number;
          locationTrackingMethod: string;
          ipStoragePolicy: string;
        };
        preferences: {
          loginAlertsEmail: boolean;
          criticalAlertsEmail: boolean;
          travelAlertsEmail: boolean;
          weeklySecurityDigest: boolean;
          dataRetentionDays: number;
        };
      };
    }>('/privacy/overview'),

  updatePreferences: async (preferences: {
    loginAlertsEmail: boolean;
    criticalAlertsEmail: boolean;
    travelAlertsEmail: boolean;
    weeklySecurityDigest: boolean;
    dataRetentionDays: number;
  }) => {
    const res = await apiRequest('/privacy/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    invalidateFeatureCache('/privacy');
    return res;
  },

  exportData: () => apiRequest('/privacy/export'),

  cleanupTelemetry: async (retentionDays: number) => {
    const res = await apiRequest<{ success: boolean; message: string; deletedCount: number }>('/privacy/retention/cleanup', {
      method: 'POST',
      body: JSON.stringify({ retentionDays }),
    });
    invalidateFeatureCache('/privacy');
    return res;
  },

  deleteAccount: async (confirmationPhrase: string) => {
    const res = await apiRequest<{ success: boolean; message: string }>('/privacy/delete-request', {
      method: 'POST',
      body: JSON.stringify({ confirmationPhrase }),
    });
    invalidateFeatureCache('/privacy');
    return res;
  },
};

// 5. Feature 5: "Was This You?" Security Confirmation API
export interface ISecurityConfirmationItem {
  _id: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  operatingSystem: string;
  riskScore: number;
  timestamp: string;
  status: 'pending' | 'confirmed_legitimate' | 'confirmed_fraudulent';
  actionTaken?: string;
  confirmedAt?: string;
}

export const securityConfirmationApi = {
  getPending: () =>
    cachedGetRequest<{ success: boolean; confirmations: ISecurityConfirmationItem[] }>('/security-confirmations/pending'),

  respond: async (id: string, decision: 'legitimate' | 'fraudulent') => {
    const res = await apiRequest<{
      success: boolean;
      message: string;
      confirmation: ISecurityConfirmationItem;
      recommendedActions?: string[];
    }>(`/security-confirmations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    invalidateFeatureCache('/security-confirmations');
    return res;
  },
};

// 6. Feature 6: Cybersecurity Learning Center API
export interface ILearningModuleItem {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  badgeName: string;
  badgeIcon: string;
  lessons: string[];
  questionCount: number;
  isCompleted: boolean;
  questions: Array<{
    id: string;
    scenario: string;
    options: string[];
  }>;
}

export const learningApi = {
  getModules: () =>
    cachedGetRequest<{
      success: boolean;
      modules: ILearningModuleItem[];
      userProgress: {
        totalPoints: number;
        badges: string[];
        completedCount: number;
        totalModules: number;
      };
    }>('/learning/modules'),

  submitQuiz: async (moduleId: string, answers: Record<string, number>) => {
    const res = await apiRequest<{
      success: boolean;
      passed: boolean;
      score: string;
      pointsAwarded: number;
      badgeEarned?: string | null;
      results: Array<{
        questionId: string;
        isCorrect: boolean;
        correctIndex: number;
        userIndex: number;
        explanation: string;
      }>;
      totalPoints: number;
      badges: string[];
    }>('/learning/submit-quiz', {
      method: 'POST',
      body: JSON.stringify({ moduleId, answers }),
    });
    invalidateFeatureCache('/learning/modules');
    return res;
  },
};

// 7. Feature 7: Smart Travel Mode API
export interface ITravelPlanItem {
  _id: string;
  destinationCity: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  purpose?: string;
  notes?: string;
  isActive: boolean;
}

export const travelApi = {
  getStatus: () =>
    cachedGetRequest<{
      success: boolean;
      travelModeEnabled: boolean;
      activePlan?: ITravelPlanItem;
      upcomingPlans: ITravelPlanItem[];
      pastPlans: ITravelPlanItem[];
      policyNotice: string;
    }>('/travel/status'),

  createPlan: async (data: {
    destinationCity: string;
    destinationCountry: string;
    startDate: string;
    endDate: string;
    purpose?: string;
    notes?: string;
  }) => {
    const res = await apiRequest<{ success: boolean; message: string; plan: ITravelPlanItem }>('/travel/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    invalidateFeatureCache('/travel');
    return res;
  },

  getPlanDetails: (id: string) =>
    cachedGetRequest<{
      success: boolean;
      plan: ITravelPlanItem;
      relatedLogins: Array<{
        _id: string;
        timestamp: string;
        city: string;
        country: string;
        ipAddress: string;
        browser: string;
        os: string;
        status: string;
        riskScore: number;
      }>;
    }>(`/travel/plan/${id}`),

  updatePlan: async (
    id: string,
    data: {
      destinationCity: string;
      destinationCountry: string;
      startDate: string;
      endDate: string;
      purpose?: string;
      notes?: string;
    }
  ) => {
    const res = await apiRequest<{ success: boolean; message: string; plan: ITravelPlanItem }>(`/travel/plan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    invalidateFeatureCache('/travel');
    return res;
  },

  deletePlan: async (id: string) => {
    const res = await apiRequest<{ success: boolean; message: string }>(`/travel/plan/${id}`, {
      method: 'DELETE',
    });
    invalidateFeatureCache('/travel');
    return res;
  },

  toggle: async (enabled: boolean) => {
    const res = await apiRequest<{ success: boolean; travelModeEnabled: boolean; message: string }>('/travel/toggle', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
    invalidateFeatureCache('/travel');
    return res;
  },
};

