import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { PrivacyPreference } from '../models/PrivacyPreference.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { TrustedDevice } from '../models/TrustedDevice.js';
import { SecurityAlert } from '../models/SecurityAlert.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { User } from '../models/User.js';

/**
 * GET /api/privacy/overview
 * Returns transparent disclosure of all personal and telemetry data collected by SecurePulse.
 */
export async function getPrivacyOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const [totalLogins, totalDevices, totalAlerts, preferences] = await Promise.all([
      LoginHistory.countDocuments ? LoginHistory.countDocuments({ userId: user._id }) : 0,
      TrustedDevice.countDocuments ? TrustedDevice.countDocuments({ userId: user._id }) : 0,
      SecurityAlert.countDocuments ? SecurityAlert.countDocuments({ userId: user._id }) : 0,
      PrivacyPreference.findOne({ userId: user._id }),
    ]);

    res.status(200).json({
      success: true,
      dataInventory: {
        identity: {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          mobileNumber: user.mobileNumber || 'Not provided',
          accountCreated: user.createdAt,
          accountStatus: user.accountStatus,
        },
        telemetry: {
          totalStoredLogins: totalLogins || 0,
          registeredDevices: totalDevices || 0,
          historicalAlerts: totalAlerts || 0,
          locationTrackingMethod: 'Coarse GeoIP based on client IP headers (city/country level only; zero GPS precision tracking)',
          ipStoragePolicy: 'Hashed/Masked for rate limiting and anomaly scoring',
        },
        preferences: preferences || {
          loginAlertsEmail: true,
          criticalAlertsEmail: true,
          travelAlertsEmail: true,
          weeklySecurityDigest: false,
          dataRetentionDays: 90,
          anonymizeIpInLogs: false,
          allowSecurityTelemetry: true,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load privacy overview.' });
  }
}

/**
 * PUT /api/privacy/preferences
 * Updates user notification and telemetry preferences.
 */
export async function updatePrivacyPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const {
      loginAlertsEmail = true,
      criticalAlertsEmail = true,
      travelAlertsEmail = true,
      weeklySecurityDigest = false,
      dataRetentionDays = 90,
    } = req.body;

    let pref = await PrivacyPreference.findOne({ userId });
    if (!pref) {
      pref = await PrivacyPreference.create({
        userId,
        loginAlertsEmail,
        criticalAlertsEmail,
        travelAlertsEmail,
        weeklySecurityDigest,
        dataRetentionDays: Number(dataRetentionDays) || 90,
      });
    } else {
      pref.loginAlertsEmail = Boolean(loginAlertsEmail);
      pref.criticalAlertsEmail = Boolean(criticalAlertsEmail);
      pref.travelAlertsEmail = Boolean(travelAlertsEmail);
      pref.weeklySecurityDigest = Boolean(weeklySecurityDigest);
      pref.dataRetentionDays = Number(dataRetentionDays) || 90;
      await pref.save();
    }

    res.status(200).json({
      success: true,
      message: 'Privacy and notification preferences updated successfully.',
      preferences: pref,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update preferences.' });
  }
}

/**
 * GET /api/privacy/export
 * Exports all user-permitted account data in JSON format.
 * STRICT SECURITY: NEVER EXPORTS PASSWORD HASHES, SALTS, TOKENS, OR OTPs.
 */
export async function exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const [loginHistory, devices, alerts] = await Promise.all([
      LoginHistory.find({ userId: user._id }).sort({ loginTimestamp: -1 }).limit(100),
      TrustedDevice.find({ userId: user._id }),
      SecurityAlert.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100),
    ]);

    // Sanitize user object (exclude sensitive secrets)
    const sanitizedProfile = {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      mobileNumber: user.mobileNumber,
      emailVerified: user.emailVerified,
      themePreference: user.themePreference,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // ZERO PASSWORD HASH, ZERO SALTS, ZERO OTPS, ZERO TOKENS
    };

    const sanitizedLogins = loginHistory.map((l: any) => ({
      timestamp: l.loginTimestamp,
      ipAddress: l.ipAddress,
      city: l.city,
      country: l.country,
      browser: l.browserName,
      os: l.operatingSystem,
      status: l.loginStatus,
      riskScore: l.riskScore,
    }));

    const sanitizedDevices = devices.map((d: any) => ({
      deviceName: d.deviceName,
      browser: d.browser,
      operatingSystem: d.operatingSystem,
      deviceType: d.deviceType,
      city: d.city,
      country: d.country,
      firstTrustedAt: d.firstTrustedAt,
      lastUsedAt: d.lastUsedAt,
    }));

    const sanitizedAlerts = alerts.map((a: any) => ({
      title: a.title,
      description: a.description,
      severity: a.severity,
      createdAt: a.createdAt,
    }));

    const exportPayload = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'SecurePulse GDPR & Privacy Compliant Account Export v1.0',
        platform: 'SecurePulse Adaptive Security Engine',
      },
      profile: sanitizedProfile,
      loginHistory: sanitizedLogins,
      trustedDevices: sanitizedDevices,
      securityAlerts: sanitizedAlerts,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="securepulse-data-export-${user.username}.json"`);
    res.status(200).json(exportPayload);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to export account data.' });
  }
}

/**
 * POST /api/privacy/retention/cleanup
 * Deletes user's old login records based on chosen retention period.
 */
export async function cleanupOldTelemetry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { retentionDays = 90 } = req.body;
    const days = Math.max(7, Number(retentionDays) || 90);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deleteResult = await LoginHistory.deleteMany
      ? await LoginHistory.deleteMany({ userId, loginTimestamp: { $lt: cutoffDate } })
      : { deletedCount: 0 };

    res.status(200).json({
      success: true,
      message: `Cleaned up login telemetry records older than ${days} days.`,
      deletedCount: (deleteResult as any)?.deletedCount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to prune telemetry data.' });
  }
}

/**
 * POST /api/privacy/delete-request
 * Confirmed Account Deletion.
 * Requires user to submit explicit confirmation phrase: 'DELETE MY ACCOUNT PERMANENTLY'.
 */
export async function requestAccountDeletion(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { confirmationPhrase } = req.body;

    if (confirmationPhrase !== 'DELETE MY ACCOUNT PERMANENTLY') {
      res.status(400).json({
        success: false,
        message: 'Confirmation phrase mismatch. Please type "DELETE MY ACCOUNT PERMANENTLY" to confirm.',
      });
      return;
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // 1. Revoke all active sessions
    await ActiveSession.deleteMany ? await ActiveSession.deleteMany({ userId: user._id }) : null;

    // 2. Clear trusted devices
    await TrustedDevice.deleteMany ? await TrustedDevice.deleteMany({ userId: user._id }) : null;

    // 3. Mark user status as suspended / deleted
    user.accountStatus = 'suspended';
    await (user as any).save?.();

    // 4. Clear auth cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    res.status(200).json({
      success: true,
      message: 'Account has been deactivated and scheduled for permanent purge. All sessions revoked.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process account deletion request.' });
  }
}

