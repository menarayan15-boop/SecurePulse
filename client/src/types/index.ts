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

