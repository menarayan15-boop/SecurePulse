import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { SecurityAlert } from '../models/SecurityAlert.js';
import { OTPVerification } from '../models/OTPVerification.js';
import {
  generateSecureOTP,
  hashToken,
  hashPassword,
  generateRandomToken,
} from '../utils/crypto.js';
import {
  sendOtpEmail,
  sendSecurityAlertEmail,
  createInAppAlert,
  logSecurityAudit,
} from '../services/notificationService.js';
import { calculateThemeForIST } from '../utils/themeEngine.js';
import { ImpossibleTravelAlert } from '../models/ImpossibleTravelAlert.js';
import { AccountProtectionEvent } from '../models/AccountProtectionEvent.js';
import { PasskeyCredential } from '../models/PasskeyCredential.js';
import { RecoveryCode } from '../models/RecoveryCode.js';
import {
  generateBackupCodesForUser,
  getRecoveryCodeStats,
  verifyAndBurnRecoveryCode,
} from '../services/recoveryService.js';
import {
  getAccountProtectionOverview,
  executeEmergencyFreeze,
} from '../services/accountProtectionService.js';
import {
  getPersonalSecurityTimeline,
  generateTimelineCsv,
} from '../services/timelineService.js';

export async function getSecurityOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const [
      totalSuccessLogins,
      totalFailedLogins,
      trustedDevicesCount,
      activeSessionsCount,
      unreadAlertsCount,
      recentAlerts,
      recentLogins,
    ] = await Promise.all([
      LoginHistory.countDocuments({ userId, loginStatus: 'success' }),
      LoginHistory.countDocuments({ userId, loginStatus: 'failed' }),
      TrustedDevice.countDocuments({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
      ActiveSession.countDocuments({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
      SecurityAlert.countDocuments({ userId, readStatus: false }),
      SecurityAlert.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      LoginHistory.find({ userId }).sort({ loginTimestamp: -1 }).limit(5).lean(),
    ]);

    // Calculate Health Score
    let healthScore = 0;
    if (user.emailVerified) healthScore += 25;
    if (user.mobileNumber && user.mobileNumber.length >= 8) healthScore += 15;
    if (totalFailedLogins < 3) healthScore += 20;
    if (trustedDevicesCount <= 5) healthScore += 15;
    if (activeSessionsCount <= 3) healthScore += 15;
    if (user.securitySettings?.unfamiliarDeviceOtpEnforced) healthScore += 10;

    let healthStatus: 'Excellent' | 'Good' | 'Fair' | 'At Risk' = 'Fair';
    if (healthScore >= 85) healthStatus = 'Excellent';
    else if (healthScore >= 70) healthStatus = 'Good';
    else if (healthScore >= 50) healthStatus = 'Fair';
    else healthStatus = 'At Risk';

    const themeCalc = calculateThemeForIST(user.themePreference);

    res.status(200).json({
      success: true,
      stats: {
        totalSuccessLogins,
        totalFailedLogins,
        trustedDevicesCount,
        activeSessionsCount,
        unreadAlertsCount,
        healthScore,
        healthStatus,
      },
      recentAlerts,
      recentLogins,
      currentEnvironment: req.envInfo,
      themeInfo: themeCalc,
      accountStatus: user.accountStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve security overview.' });
  }
}

export async function getSecurityAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { unreadOnly } = req.query;

    const filter: Record<string, any> = { userId };
    if (unreadOnly === 'true') {
      filter.readStatus = false;
    }

    const alerts = await SecurityAlert.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const unreadCount = await SecurityAlert.countDocuments({ userId, readStatus: false });

    res.status(200).json({
      success: true,
      data: alerts,
      unreadCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve alerts.' });
  }
}

export async function markAlertRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const alert = await SecurityAlert.findOneAndUpdate(
      { _id: id, userId },
      { readStatus: true },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Alert marked as read.', alert });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update alert status.' });
  }
}

export async function clearAllAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    await SecurityAlert.updateMany({ userId, readStatus: false }, { readStatus: true });

    res.status(200).json({ success: true, message: 'All alerts marked as read.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to clear alerts.' });
  }
}

export async function getHealthScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const [activeSessionsCount, trustedDevicesCount, recentFailures] = await Promise.all([
      ActiveSession.countDocuments({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
      TrustedDevice.countDocuments({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }),
      LoginHistory.countDocuments({
        userId,
        loginStatus: 'failed',
        loginTimestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const factors = [
      {
        id: 'email_verified',
        title: 'Primary Email Verified',
        description: 'Secures your account for recovery and OTP challenge transmissions.',
        passed: user.emailVerified,
        weight: 25,
        recommendation: user.emailVerified ? 'Completed' : 'Verify your primary email immediately.',
      },
      {
        id: 'mobile_recovery',
        title: 'Recovery Mobile Linked',
        description: 'Provides secondary verification channel for OTP and alert notifications.',
        passed: Boolean(user.mobileNumber && user.mobileNumber.length >= 8),
        weight: 15,
        recommendation: user.mobileNumber ? 'Mobile linked' : 'Add a recovery mobile number in My Profile.',
      },
      {
        id: 'unfamiliar_otp',
        title: 'Unfamiliar Environment Challenge Enforced',
        description: 'Automatically challenges logins from new browsers, devices, or locations.',
        passed: Boolean(user.securitySettings?.unfamiliarDeviceOtpEnforced),
        weight: 20,
        recommendation: user.securitySettings?.unfamiliarDeviceOtpEnforced
          ? 'Active & protecting logins'
          : 'Enable unfamiliar device OTP in Security Settings.',
      },
      {
        id: 'login_hygiene',
        title: 'Clean Login Record (7 Days)',
        description: 'Zero suspicious or multiple failed login attempts recently.',
        passed: recentFailures < 3,
        weight: 15,
        recommendation: recentFailures < 3
          ? 'No anomalous failed login spikes'
          : `${recentFailures} failed attempts recorded this week. Review Login History.`,
      },
      {
        id: 'session_hygiene',
        title: 'Concurrent Session Hygiene',
        description: 'Keep simultaneous active sessions limited to 3 devices or fewer.',
        passed: activeSessionsCount <= 3,
        weight: 15,
        recommendation: activeSessionsCount <= 3
          ? `Optimal (${activeSessionsCount} active session)`
          : `You have ${activeSessionsCount} active sessions. Review and terminate unused sessions.`,
      },
      {
        id: 'trusted_device_review',
        title: 'Trusted Device Footprint',
        description: 'Regularly audit devices granted long-term trust.',
        passed: trustedDevicesCount <= 5,
        weight: 10,
        recommendation: trustedDevicesCount <= 5
          ? `Under control (${trustedDevicesCount} trusted)`
          : `High number of trusted devices (${trustedDevicesCount}). Revoke old devices.`,
      },
    ];

    const totalScore = factors.reduce((sum, f) => sum + (f.passed ? f.weight : 0), 0);

    let status = 'Needs Improvement';
    if (totalScore >= 85) status = 'Excellent';
    else if (totalScore >= 70) status = 'Good';
    else if (totalScore >= 50) status = 'Fair';

    res.status(200).json({
      success: true,
      score: totalScore,
      status,
      factors,
      activeSessionsCount,
      trustedDevicesCount,
      recentFailures,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to calculate security score.' });
  }
}

export async function emergencyLockAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { confirmationPhrase } = req.body;

    if (confirmationPhrase !== 'LOCK MY ACCOUNT') {
      res.status(400).json({
        success: false,
        message: 'Please confirm by typing "LOCK MY ACCOUNT" exactly to activate emergency lockdown.',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // 1. Invalidate ALL active sessions
    await ActiveSession.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    // 2. Revoke ALL trusted devices
    await TrustedDevice.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    // 3. Mark account status as locked
    user.accountStatus = 'locked';
    user.lockedAt = new Date();
    user.lockReason = 'Emergency lockdown triggered by account owner';
    await user.save();

    // 4. Create high-priority critical alert & audit record
    await createInAppAlert({
      userId,
      alertType: 'emergency_locked',
      severity: 'critical',
      title: 'Emergency Account Lockdown Activated',
      description: 'Account was locked by user. All active sessions and trusted devices were terminated. Account recovery required.',
    });

    await logSecurityAudit({
      userId,
      action: 'Emergency Account Lock Activated',
      eventType: 'lock',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
    });

    // 5. Send notification email
    await sendSecurityAlertEmail(
      user.email,
      user.fullName,
      'EMERGENCY ACCOUNT LOCKDOWN INITIATED',
      'You (or someone using your account) triggered an Emergency Account Lock. All sessions and trusted devices have been terminated. Nobody can log in until recovery verification is completed.',
      `Lock initiated from IP ${req.envInfo?.ipAddress} (${req.envInfo?.city}, ${req.envInfo?.country})`
    );

    // 6. Clear all auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');
    res.clearCookie('trustedDeviceToken');

    res.status(200).json({
      success: true,
      accountStatus: 'locked',
      message: 'Emergency lock activated. All sessions have been terminated and your account is locked.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to execute emergency lock.' });
  }
}

export async function requestAccountRecovery(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'Email address or username is required.' });
      return;
    }

    const clean = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: clean }, { username: clean }],
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If the account exists, an unlock recovery verification code has been dispatched.',
      });
      return;
    }

    const otp = generateSecureOTP();
    const otpHash = hashToken(otp);
    const recoveryChallenge = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);

    await OTPVerification.create({
      userId: user._id,
      otpHash,
      deliveryMethod: 'email',
      purpose: 'account_unlock',
      expiresAt,
      resendAvailableAt,
      metadata: { recoveryChallenge },
    });

    try {
      await sendOtpEmail(user.email, otp, 'recovery', user.fullName);
    } catch (emailErr: any) {
      console.error(`[AUTH_PIPELINE] [EMAIL_DISPATCH_FAILED] Recovery email aborted for ${user.email}:`, emailErr.message);
      res.status(503).json({
        success: false,
        message: "We couldn't send your verification code. Please try again.",
      });
      return;
    }

    const maskedEmail = user.email.replace(/(^.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + '*'.repeat(b.length));

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your registered email.',
      recoveryChallenge,
      maskedEmail,
      userId: user._id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to initiate account recovery.' });
  }
}

export async function completeAccountRecovery(req: Request, res: Response): Promise<void> {
  try {
    const { recoveryChallenge, otp, newPassword } = req.body;

    if (!recoveryChallenge || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'All recovery verification fields are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New security password must be at least 8 characters long.' });
      return;
    }

    const verification = await OTPVerification.findOne({
      'metadata.recoveryChallenge': recoveryChallenge,
      purpose: 'account_unlock',
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      res.status(400).json({ success: false, message: 'Recovery challenge is invalid or has expired.' });
      return;
    }

    const otpHash = hashToken(otp.trim());
    if (verification.otpHash !== otpHash) {
      verification.attempts += 1;
      await verification.save();
      res.status(400).json({
        success: false,
        message: `Incorrect code. ${verification.maxAttempts - verification.attempts} attempts remaining.`,
      });
      return;
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    // Unlock user & update password
    user.accountStatus = 'active';
    user.lockedAt = undefined;
    user.lockReason = undefined;
    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    verification.verifiedAt = new Date();
    verification.usedAt = new Date();
    await verification.save();

    await createInAppAlert({
      userId: user._id,
      alertType: 'account_recovered',
      severity: 'low',
      title: 'Account Unlocked & Restored',
      description: 'Your account was successfully recovered and unlocked with a new password.',
    });

    await logSecurityAudit({
      userId: user._id,
      action: 'Account Unlocked & Recovered',
      eventType: 'lock',
    });

    await sendSecurityAlertEmail(
      user.email,
      user.fullName,
      'Account Restored Successfully',
      'Your SecurePulse account was successfully unlocked and restored with a fresh password. You may now log in normally.'
    );

    res.status(200).json({
      success: true,
      message: 'Your account has been unlocked and secured with your new password! You may now log in.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to complete account recovery.' });
  }
}

/**
 * FEATURE 1: AI-Powered Login Risk Analysis Overview
 */
export async function getRiskAnalysisOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const logins = await LoginHistory.find({ userId })
      .sort({ loginTimestamp: -1 })
      .limit(50)
      .lean();

    const totalLogins = logins.length;
    let totalScore = 0;
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    const factorCounts: Record<string, number> = {};

    for (const l of logins) {
      const s = typeof l.riskScore === 'number' ? l.riskScore : 10;
      totalScore += s;

      if (s >= 81) distribution.critical++;
      else if (s >= 61) distribution.high++;
      else if (s >= 31) distribution.medium++;
      else distribution.low++;

      if (Array.isArray(l.riskFactors)) {
        for (const f of l.riskFactors) {
          factorCounts[f] = (factorCounts[f] || 0) + 1;
        }
      }
    }

    const avgRiskScore = totalLogins > 0 ? Math.round(totalScore / totalLogins) : 10;
    const currentSessionScore = logins[0]?.riskScore ?? 10;

    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (avgRiskScore >= 81) overallRiskLevel = 'critical';
    else if (avgRiskScore >= 61) overallRiskLevel = 'high';
    else if (avgRiskScore >= 31) overallRiskLevel = 'medium';

    const topFactors = Object.entries(factorCounts)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        avgRiskScore,
        currentSessionScore,
        overallRiskLevel,
        totalEvaluatedLogins: totalLogins,
        distribution,
        topFactors,
        engineStatus: 'Adaptive Multi-Factor Evaluation Engine Online (Active)',
        configurableWeights: [
          { name: 'Impossible Travel Velocity', maxWeight: 40, active: true },
          { name: 'Authentication Velocity (Failures)', maxWeight: 35, active: true },
          { name: 'Device Environment Anomaly', maxWeight: 20, active: true },
          { name: 'Browser Fingerprint Change', maxWeight: 15, active: true },
          { name: 'Geographical Region Shift', maxWeight: 15, active: true },
          { name: 'Temporal Pattern (Off-Hours)', maxWeight: 10, active: true },
          { name: 'Trusted Device Hardware Credit', maxWeight: -25, active: true },
        ],
      },
      recentEvaluations: logins.slice(0, 15).map((l: any) => ({
        id: l._id,
        timestamp: l.loginTimestamp,
        riskScore: l.riskScore,
        riskFactors: l.riskFactors || [],
        riskScoreBreakdown: l.riskScoreBreakdown || [],
        ipAddress: l.ipAddress,
        city: l.city,
        country: l.country,
        deviceType: l.deviceType,
        browserName: l.browserName,
        operatingSystem: l.operatingSystem,
        status: l.loginStatus,
        impossibleTravel: l.impossibleTravel,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve risk analysis analytics.' });
  }
}

/**
 * FEATURE 2: Impossible Travel Alerts
 */
export async function getImpossibleTravelData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const [alerts, recentLoginsWithCoords] = await Promise.all([
      ImpossibleTravelAlert.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
      LoginHistory.find({
        userId,
        loginStatus: 'success',
        'approximateCoordinates.lat': { $ne: 0 },
      })
        .sort({ loginTimestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    const pendingCount = alerts.filter((a: any) => a.status === 'pending').length;

    res.status(200).json({
      success: true,
      pendingCount,
      alerts,
      recentLocationPins: recentLoginsWithCoords.map((l: any) => ({
        id: l._id,
        city: l.city,
        country: l.country,
        coordinates: l.approximateCoordinates,
        timestamp: l.loginTimestamp,
        ipAddress: l.ipAddress,
        browser: l.browserName,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve impossible travel telemetry.' });
  }
}

export async function resolveImpossibleTravel(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { resolution } = req.body; // 'resolved_user' | 'reported_suspicious'

    const alert = await ImpossibleTravelAlert.findOne({ _id: id, userId: req.userId });
    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found.' });
      return;
    }

    alert.status = resolution === 'reported_suspicious' ? 'reported_suspicious' : 'resolved_user';
    await alert.save();

    if (resolution === 'reported_suspicious') {
      // Revoke other sessions immediately to safeguard account
      await ActiveSession.updateMany(
        { userId: req.userId, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } }
      );

      await logSecurityAudit({
        userId: req.userId as any,
        action: 'Impossible Travel Flagged as Suspicious by User - All Sessions Reset',
        eventType: 'security',
      });
    } else {
      await logSecurityAudit({
        userId: req.userId as any,
        action: 'Impossible Travel Marked as Legitimate (VPN/Proxy) by User',
        eventType: 'security',
      });
    }

    res.status(200).json({
      success: true,
      message:
        resolution === 'reported_suspicious'
          ? 'Alert reported as suspicious. All active sessions have been safely reset for your security.'
          : 'Activity marked as recognized (VPN/Proxy).',
      alert,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to resolve travel alert.' });
  }
}

/**
 * FEATURE 3: Real-Time Security Alert Center Enhancements
 */
export async function markAllAlertsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await SecurityAlert.updateMany(
      { userId: req.userId, readStatus: false },
      { $set: { readStatus: true } }
    );
    res.status(200).json({ success: true, message: 'All security alerts marked as read.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to mark alerts as read.' });
  }
}

export async function deleteAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await SecurityAlert.deleteOne({ _id: id, userId: req.userId });
    res.status(200).json({ success: true, message: 'Alert dismissed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete alert.' });
  }
}

export async function getAlertPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      preferences: {
        allowEmailAlerts: user.securitySettings?.allowEmailAlerts ?? true,
        allowSmsAlerts: user.securitySettings?.allowSmsAlerts ?? false,
        highRiskOtpEnforced: user.securitySettings?.highRiskOtpEnforced ?? true,
        unfamiliarDeviceOtpEnforced: user.securitySettings?.unfamiliarDeviceOtpEnforced ?? true,
        trustedDeviceDurationDays: user.securitySettings?.trustedDeviceDurationDays ?? 30,
        recoveryEmail: user.recoveryEmail || '',
        recoveryEmailVerified: user.recoveryEmailVerified || false,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve alert preferences.' });
  }
}

export async function updateAlertPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { allowEmailAlerts, highRiskOtpEnforced, unfamiliarDeviceOtpEnforced, recoveryEmail } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (user.securitySettings) {
      if (typeof allowEmailAlerts === 'boolean') user.securitySettings.allowEmailAlerts = allowEmailAlerts;
      if (typeof highRiskOtpEnforced === 'boolean') user.securitySettings.highRiskOtpEnforced = highRiskOtpEnforced;
      if (typeof unfamiliarDeviceOtpEnforced === 'boolean') user.securitySettings.unfamiliarDeviceOtpEnforced = unfamiliarDeviceOtpEnforced;
    }

    if (typeof recoveryEmail === 'string') {
      const cleanRecovery = recoveryEmail.trim().toLowerCase();
      if (cleanRecovery && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecovery)) {
        res.status(400).json({ success: false, message: 'Please enter a valid secondary recovery email.' });
        return;
      }
      user.recoveryEmail = cleanRecovery;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Alert & notification preferences updated successfully.',
      preferences: user.securitySettings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update alert preferences.' });
  }
}

/**
 * FEATURE 5: Account Takeover (ATO) Protection
 */
export async function getAccountProtectionData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = await getAccountProtectionOverview(req.userId as any);
    res.status(200).json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to retrieve account protection status.' });
  }
}

export async function executeEmergencyFreezeAction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { reason } = req.body;
    await executeEmergencyFreeze(req.userId as any, reason || 'User requested emergency account freeze from dashboard');
    res.status(200).json({
      success: true,
      message: 'Emergency freeze activated. All active sessions and devices revoked. Account locked.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to execute emergency freeze.' });
  }
}

/**
 * FEATURE 6: Personal Security Timeline
 */
export async function getSecurityTimelineData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { category, search, limit, skip } = req.query;
    const data = await getPersonalSecurityTimeline(req.userId as any, {
      category: category as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      skip: skip ? parseInt(skip as string, 10) : 0,
    });

    res.status(200).json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve personal security timeline.' });
  }
}

export async function exportSecurityTimelineData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { format = 'csv' } = req.query;
    const data = await getPersonalSecurityTimeline(req.userId as any, { limit: 500 });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="securepulse-security-audit-${Date.now()}.json"`);
      res.status(200).send(JSON.stringify(data.items, null, 2));
      return;
    }

    const csv = generateTimelineCsv(data.items);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="securepulse-security-audit-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to export security timeline.' });
  }
}

/**
 * FEATURE 7: Emergency Recovery Codes
 */
export async function getRecoveryCodesStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stats = await getRecoveryCodeStats(req.userId as any);
    res.status(200).json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve recovery codes status.' });
  }
}

export async function generateNewRecoveryCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const codes = await generateBackupCodesForUser(req.userId as any);
    res.status(200).json({
      success: true,
      message: '10 single-use emergency backup recovery codes generated. Store them in a safe place!',
      codes,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate backup recovery codes.' });
  }
}

export async function verifyRecoveryCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { code, identifier, newPassword } = req.body;
    if (!code) {
      res.status(400).json({ success: false, message: 'Please provide a recovery code.' });
      return;
    }

    let targetUserId = req.userId as any;
    if (!targetUserId && identifier) {
      const clean = identifier.trim().toLowerCase();
      const user = await User.findOne({
        $or: [{ email: clean }, { username: clean }],
      });
      if (user) {
        targetUserId = user._id;
      }
    }

    if (!targetUserId) {
      res.status(400).json({
        success: false,
        message: 'Could not identify account. Please specify your email or username.',
      });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    const result = await verifyAndBurnRecoveryCode(targetUserId, code);
    if (!result.verified) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    if (newPassword) {
      const user = await User.findById(targetUserId);
      if (user) {
        user.passwordHash = await hashPassword(newPassword);
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: result.message || 'Recovery code verified and account successfully restored.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify recovery code.' });
  }
}

