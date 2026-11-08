import { Types } from 'mongoose';
import { AccountProtectionEvent } from '../models/AccountProtectionEvent.js';
import { User } from '../models/User.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { PasskeyCredential } from '../models/PasskeyCredential.js';
import { RecoveryCode } from '../models/RecoveryCode.js';
import { createInAppAlert, logSecurityAudit, sendSecurityAlertEmail } from './notificationService.js';
import { ILoginEnvironment } from '../types/index.js';

export async function logAccountProtectionEvent(params: {
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
  env?: ILoginEnvironment;
  actionRequired?: string;
}) {
  try {
    const event = await AccountProtectionEvent.create({
      userId: params.userId,
      eventType: params.eventType,
      riskLevel: params.riskLevel,
      title: params.title,
      description: params.description,
      ipAddress: params.env?.ipAddress || 'Internal Operation',
      browser: params.env?.browserName || 'System',
      actionRequired: params.actionRequired || '',
    });

    // Check for rapid successive sensitive modifications in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentEventsCount = await AccountProtectionEvent.countDocuments({
      userId: params.userId,
      createdAt: { $gte: tenMinutesAgo },
    });

    if (recentEventsCount >= 3) {
      await createInAppAlert({
        userId: params.userId,
        alertType: 'suspicious_account_modification',
        severity: 'critical',
        title: 'Rapid Account Modifications Detected',
        description: 'Multiple high-privilege account security changes occurred in a brief window. Please review your account activity.',
      });
    }

    return event;
  } catch (err: any) {
    console.error('[ACCOUNT_PROTECTION] Failed to log event:', err.message);
  }
}

/**
 * Calculates user's Account Protection Status and metrics
 */
export async function getAccountProtectionOverview(userId: Types.ObjectId) {
  const [
    user,
    passkeysCount,
    recoveryCodesCount,
    trustedDevicesCount,
    activeSessionsCount,
    recentEvents,
  ] = await Promise.all([
    User.findById(userId).lean(),
    PasskeyCredential.countDocuments({ userId }),
    RecoveryCode.countDocuments({ userId, used: false }),
    TrustedDevice.countDocuments({ userId, revokedAt: { $exists: false } }),
    ActiveSession.countDocuments({ userId, revokedAt: { $exists: false } }),
    AccountProtectionEvent.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  if (!user) throw new Error('User not found');

  // Calculate Account Protection Score (0-100)
  let score = 30; // base verified user
  const checklist = [
    {
      id: 'email_verified',
      title: 'Primary Email Verified',
      status: user.emailVerified ? 'passed' : 'failed',
      points: 20,
    },
    {
      id: 'passkey_active',
      title: 'Hardware Passkey Enabled',
      status: passkeysCount > 0 ? 'passed' : 'recommended',
      points: 20,
    },
    {
      id: 'recovery_codes',
      title: 'Emergency Recovery Codes Generated',
      status: recoveryCodesCount > 0 ? 'passed' : 'recommended',
      points: 15,
    },
    {
      id: 'recovery_email',
      title: 'Secondary Recovery Email Configured',
      status: user.recoveryEmail ? 'passed' : 'optional',
      points: 10,
    },
    {
      id: 'session_hygiene',
      title: 'Active Session Hygiene (≤ 5 sessions)',
      status: activeSessionsCount <= 5 ? 'passed' : 'warning',
      points: 10,
    },
    {
      id: 'high_risk_enforcement',
      title: 'High-Risk OTP Protection Enforced',
      status: user.securitySettings?.highRiskOtpEnforced ? 'passed' : 'failed',
      points: 5,
    },
  ];

  for (const item of checklist) {
    if (item.status === 'passed') {
      score += item.points;
    }
  }

  score = Math.min(100, score);

  let protectionTier: 'Fortified' | 'Strong' | 'Moderate' | 'Vulnerable' = 'Moderate';
  if (score >= 90) protectionTier = 'Fortified';
  else if (score >= 75) protectionTier = 'Strong';
  else if (score >= 50) protectionTier = 'Moderate';
  else protectionTier = 'Vulnerable';

  return {
    protectionScore: score,
    protectionTier,
    metrics: {
      passkeysCount,
      recoveryCodesCount,
      trustedDevicesCount,
      activeSessionsCount,
      hasRecoveryEmail: !!user.recoveryEmail,
    },
    checklist,
    recentEvents,
  };
}

/**
 * Emergency Freeze Account: revokes all active sessions, revokes devices, locks account
 */
export async function executeEmergencyFreeze(userId: Types.ObjectId, reason: string = 'User initiated emergency freeze') {
  await Promise.all([
    User.updateOne(
      { _id: userId },
      {
        $set: {
          accountStatus: 'locked',
          lockedAt: new Date(),
          lockReason: reason,
        },
      }
    ),
    ActiveSession.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    ),
    TrustedDevice.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    ),
  ]);

  await logAccountProtectionEvent({
    userId,
    eventType: 'security_settings_update',
    riskLevel: 'critical',
    title: 'Emergency Account Freeze Triggered',
    description: reason,
    actionRequired: 'Initiate account unlock via Emergency Recovery Center',
  });
}

