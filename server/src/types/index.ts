import { Request } from 'express';
import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  username: string;
  email: string;
  recoveryEmail?: string;
  recoveryEmailVerified?: boolean;
  mobileNumber?: string;
  passwordHash: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  profileImage?: string;
  themePreference: 'auto' | 'light' | 'dark';
  themeOverride: boolean;
  securitySettings: {
    trustedDeviceDurationDays: number;
    allowEmailAlerts: boolean;
    allowSmsAlerts: boolean;
    highRiskOtpEnforced: boolean;
    unfamiliarDeviceOtpEnforced: boolean;
  };
  accountStatus: 'active' | 'locked' | 'suspended';
  lockedAt?: Date;
  lockReason?: string;
  preferredAuthMethod?: 'password' | 'passkey';
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoginEnvironment {
  ipAddress: string;
  browserName: string;
  browserVersion: string;
  browserEngine?: string;
  operatingSystem: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceModel?: string;
  deviceVendor?: string;
  city: string;
  state: string;
  country: string;
  approximateCoordinates: {
    lat: number;
    lng: number;
  };
  userAgent: string;
}

export interface IRiskScoreFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface IRiskAnalysis {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  scoreBreakdown: IRiskScoreFactor[];
  isNewBrowser: boolean;
  isNewDevice: boolean;
  isNewIp: boolean;
  isNewLocation: boolean;
  isSuspicious: boolean;
  requiresOtp: boolean;
  action: 'allow' | 'challenge_otp' | 'challenge_high_risk' | 'block_critical';
  impossibleTravel?: {
    detected: boolean;
    distanceKm: number;
    speedKmPerHour: number;
    timeDeltaMinutes: number;
    fromLocation: string;
    toLocation: string;
  };
}

export interface IPasskeyCredential {
  userId: Types.ObjectId;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  name: string;
  aaguid?: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface IRecoveryCode {
  userId: Types.ObjectId;
  codeHash: string;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface IImpossibleTravelAlert {
  userId: Types.ObjectId;
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
  createdAt: Date;
}

export interface IAccountProtectionEvent {
  userId: Types.ObjectId;
  eventType:
    | 'password_change'
    | 'email_change'
    | 'recovery_email_change'
    | 'passkey_added'
    | 'passkey_removed'
    | 'trusted_device_change'
    | 'security_settings_update'
    | 'suspicious_recovery_attempt'
    | 'rapid_credential_modification';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ipAddress: string;
  browser: string;
  actionRequired?: string;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
  sessionId?: string;
  envInfo?: ILoginEnvironment;
}

