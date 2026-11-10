/**
 * SecurePulse Feature APIs
 * Clean, independent API client wrapping the core apiRequest.
 * Protects core authentication files by isolating all feature endpoints.
 */

import { apiRequest } from './client';

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
    apiRequest<{
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
  scanUrl: (url: string) =>
    apiRequest<{ success: boolean; analysis: IPhishingScanResult }>('/phishing/scan-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  scanContent: (content: string, type: 'email' | 'message' = 'email') =>
    apiRequest<{ success: boolean; analysis: IPhishingScanResult }>('/phishing/scan-content', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  getHistory: () =>
    apiRequest<{
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
    apiRequest<{
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
    apiRequest<{
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

  updatePreferences: (preferences: {
    loginAlertsEmail: boolean;
    criticalAlertsEmail: boolean;
    travelAlertsEmail: boolean;
    weeklySecurityDigest: boolean;
    dataRetentionDays: number;
  }) =>
    apiRequest('/privacy/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),

  exportData: () => apiRequest('/privacy/export'),

  cleanupTelemetry: (retentionDays: number) =>
    apiRequest<{ success: boolean; message: string; deletedCount: number }>('/privacy/retention/cleanup', {
      method: 'POST',
      body: JSON.stringify({ retentionDays }),
    }),

  deleteAccount: (confirmationPhrase: string) =>
    apiRequest<{ success: boolean; message: string }>('/privacy/delete-request', {
      method: 'POST',
      body: JSON.stringify({ confirmationPhrase }),
    }),
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
    apiRequest<{ success: boolean; confirmations: ISecurityConfirmationItem[] }>('/security-confirmations/pending'),

  respond: (id: string, decision: 'legitimate' | 'fraudulent') =>
    apiRequest<{
      success: boolean;
      message: string;
      confirmation: ISecurityConfirmationItem;
      recommendedActions?: string[];
    }>(`/security-confirmations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
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
    apiRequest<{
      success: boolean;
      modules: ILearningModuleItem[];
      userProgress: {
        totalPoints: number;
        badges: string[];
        completedCount: number;
        totalModules: number;
      };
    }>('/learning/modules'),

  submitQuiz: (moduleId: string, answers: Record<string, number>) =>
    apiRequest<{
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
    }),
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
    apiRequest<{
      success: boolean;
      travelModeEnabled: boolean;
      activePlan?: ITravelPlanItem;
      upcomingPlans: ITravelPlanItem[];
      pastPlans: ITravelPlanItem[];
      policyNotice: string;
    }>('/travel/status'),

  createPlan: (data: {
    destinationCity: string;
    destinationCountry: string;
    startDate: string;
    endDate: string;
    purpose?: string;
    notes?: string;
  }) =>
    apiRequest<{ success: boolean; message: string; plan: ITravelPlanItem }>('/travel/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPlanDetails: (id: string) =>
    apiRequest<{
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

  updatePlan: (
    id: string,
    data: {
      destinationCity: string;
      destinationCountry: string;
      startDate: string;
      endDate: string;
      purpose?: string;
      notes?: string;
    }
  ) =>
    apiRequest<{ success: boolean; message: string; plan: ITravelPlanItem }>(`/travel/plan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePlan: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/travel/plan/${id}`, {
      method: 'DELETE',
    }),

  toggle: (enabled: boolean) =>
    apiRequest<{ success: boolean; travelModeEnabled: boolean; message: string }>('/travel/toggle', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
};

