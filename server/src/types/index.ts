import { Request } from 'express';
import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  fullName: string;
  username: string;
  email: string;
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

export interface IRiskAnalysis {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  isNewBrowser: boolean;
  isNewDevice: boolean;
  isNewIp: boolean;
  isNewLocation: boolean;
  isSuspicious: boolean;
  requiresOtp: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
  sessionId?: string;
  envInfo?: ILoginEnvironment;
}

