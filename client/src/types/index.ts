export interface IUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobileNumber?: string;
  emailVerified: boolean;
  mobileVerified?: boolean;
  profileImage?: string;
  themePreference: 'auto' | 'light' | 'dark';
  calculatedTheme: 'light' | 'dark';
  istTimeString: string;
  securitySettings: {
    trustedDeviceDurationDays: number;
    allowEmailAlerts: boolean;
    allowSmsAlerts: boolean;
    highRiskOtpEnforced: boolean;
    unfamiliarDeviceOtpEnforced: boolean;
  };
  accountStatus: 'active' | 'locked' | 'suspended';
  createdAt?: string;
}

export interface ILoginRecord {
  _id: string;
  userId: string;
  ipAddress: string;
  browserName: string;
  browserVersion?: string;
  browserEngine?: string;
  operatingSystem: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceModel?: string;
  city: string;
  state: string;
  country: string;
  approximateCoordinates: {
    lat: number;
    lng: number;
  };
  loginTimestamp: string;
  loginStatus: 'success' | 'failed' | 'otp_required' | 'blocked';
  otpStatus: 'not_required' | 'pending' | 'verified' | 'failed';
  riskScore: number;
  riskFactors: string[];
  failureReason?: string;
  isNewDevice: boolean;
  isTrustedDevice: boolean;
}

export interface ITrustedDevice {
  id: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
  firstTrustedAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isExpired: boolean;
}

export interface IActiveSession {
  id: string;
  sessionToken: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ISecurityAlert {
  _id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  readStatus: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ISecurityOverview {
  stats: {
    totalSuccessLogins: number;
    totalFailedLogins: number;
    trustedDevicesCount: number;
    activeSessionsCount: number;
    unreadAlertsCount: number;
    healthScore: number;
    healthStatus: 'Excellent' | 'Good' | 'Fair' | 'At Risk';
  };
  recentAlerts: ISecurityAlert[];
  recentLogins: ILoginRecord[];
  currentEnvironment?: {
    ipAddress: string;
    browserName: string;
    operatingSystem: string;
    city: string;
    country: string;
  };
  themeInfo?: {
    theme: 'light' | 'dark';
    istTimeString: string;
  };
}

export interface IHealthFactor {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
  recommendation: string;
}

export interface IHealthScoreData {
  score: number;
  status: string;
  factors: IHealthFactor[];
  activeSessionsCount: number;
  trustedDevicesCount: number;
  recentFailures: number;
}

export interface IRiskScoreBreakdownItem {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface IRiskEvaluationItem {
  id: string;
  timestamp: string;
  riskScore: number;
  riskFactors: string[];
  riskScoreBreakdown?: IRiskScoreBreakdownItem[];
  ipAddress: string;
  city: string;
  country: string;
  deviceType: string;
  browserName: string;
  operatingSystem: string;
  status: string;
  impossibleTravel?: {
    detected: boolean;
    distanceKm: number;
    speedKmPerHour: number;
    fromLocation: string;
    toLocation: string;
    timeDeltaMinutes: number;
  };
}

export interface IRiskAnalyticsData {
  avgRiskScore: number;
  currentSessionScore: number;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalEvaluatedLogins: number;
  distribution: { low: number; medium: number; high: number; critical: number };
  topFactors: Array<{ factor: string; count: number }>;
  engineStatus: string;
  configurableWeights: Array<{ name: string; maxWeight: number; active: boolean }>;
}

export interface IImpossibleTravelAlertItem {
  _id: string;
  fromCity: string;
  fromCountry: string;
  fromCoordinates: { lat: number; lng: number };
  toCity: string;
  toCountry: string;
  toCoordinates: { lat: number; lng: number };
  distanceKm: number;
  timeDeltaMinutes: number;
  speedKmPerHour: number;
  status: 'pending' | 'resolved_user' | 'reported_suspicious';
  createdAt: string;
}

export interface IPasskeyItem {
  id: string;
  credentialId: string;
  name: string;
  counter: number;
  transports: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface IAccountProtectionData {
  protectionScore: number;
  protectionTier: 'Fortified' | 'Strong' | 'Moderate' | 'Vulnerable';
  metrics: {
    passkeysCount: number;
    recoveryCodesCount: number;
    trustedDevicesCount: number;
    activeSessionsCount: number;
    hasRecoveryEmail: boolean;
  };
  checklist: Array<{
    id: string;
    title: string;
    status: 'passed' | 'recommended' | 'optional' | 'failed' | 'warning';
    points: number;
  }>;
  recentEvents: Array<{
    _id: string;
    eventType: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    ipAddress: string;
    browser: string;
    actionRequired?: string;
    createdAt: string;
  }>;
}

export interface ITimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'login' | 'security' | 'suspicious' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'warning' | 'danger' | 'info';
  location: string;
  device: string;
  ipAddress: string;
  actionRecommendation?: string;
  metadata?: Record<string, any>;
}

export interface ITimelineResponse {
  items: ITimelineItem[];
  total: number;
  counts: {
    all: number;
    login: number;
    security: number;
    suspicious: number;
    recovery: number;
  };
}

export interface IRecoveryCodesStats {
  hasGeneratedCodes: boolean;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
}


