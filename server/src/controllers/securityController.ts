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

    await sendOtpEmail(user.email, otp, 'account unlock and security recovery', user.fullName);

    const maskedEmail = user.email.replace(/(^.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + '*'.repeat(b.length));

    res.status(200).json({
      success: true,
      message: 'Account unlock verification code sent.',
      recoveryChallenge,
      maskedEmail,
      userId: user._id,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
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
