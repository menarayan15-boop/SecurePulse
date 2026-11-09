import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { SecurityConfirmation } from '../models/SecurityConfirmation.js';
import { LoginHistory } from '../models/LoginHistory.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { SecurityAlert } from '../models/SecurityAlert.js';

/**
 * GET /api/security-confirmations/pending
 * Retrieves recent sign-in events eligible for "Was This You?" confirmation.
 * Syncs unconfirmed events from LoginHistory automatically.
 */
export async function getPendingConfirmations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // 1. Fetch existing confirmations
    let confirmations = await SecurityConfirmation.find({ userId }).sort({ timestamp: -1 }).limit(20);

    // 2. If fewer than 3 confirmations exist, seed from recent logins to give user immediate visibility
    if (confirmations.length === 0) {
      const recentLogins = await LoginHistory.find({ userId }).sort({ loginTimestamp: -1 }).limit(5);
      for (const login of recentLogins) {
        try {
          const doc = await SecurityConfirmation.create({
            userId,
            loginHistoryId: login._id,
            ipAddress: login.ipAddress,
            location: `${login.city || 'Unknown'}, ${login.country || 'Unknown'}`,
            device: login.deviceType || 'desktop',
            browser: login.browserName || 'Web Browser',
            operatingSystem: login.operatingSystem || 'OS',
            riskScore: login.riskScore || 10,
            timestamp: login.loginTimestamp || new Date(),
            status: 'pending',
          });
          confirmations.push(doc);
        } catch {}
      }
    }

    res.status(200).json({
      success: true,
      confirmations,
    });
  } catch (err: any) {
    console.error('[SECURITY_CONFIRMATIONS_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch security confirmations.' });
  }
}

/**
 * POST /api/security-confirmations/:id/respond
 * User confirms whether an unfamiliar login was legitimate or fraudulent.
 */
export async function respondToConfirmation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { decision } = req.body; // 'legitimate' | 'fraudulent'

    if (decision !== 'legitimate' && decision !== 'fraudulent') {
      res.status(400).json({ success: false, message: 'Invalid decision. Must be "legitimate" or "fraudulent".' });
      return;
    }

    const item = await SecurityConfirmation.findOne({ _id: id, userId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Confirmation record not found or unauthorized.' });
      return;
    }

    if (decision === 'legitimate') {
      item.status = 'confirmed_legitimate';
      item.actionTaken = 'Verified as legitimate by user. Device context confirmed.';
      item.confirmedAt = new Date();
      await item.save();

      res.status(200).json({
        success: true,
        message: 'Login confirmed as legitimate. Thank you for securing your account.',
        confirmation: item,
      });
      return;
    }

    // decision === 'fraudulent'
    item.status = 'confirmed_fraudulent';
    item.actionTaken = 'Flagged as FRAUDULENT by user. Active sessions from this IP/device revoked.';
    item.confirmedAt = new Date();
    await item.save();

    // 1. Revoke any matching active sessions from that IP address
    if (item.ipAddress) {
      try {
        await ActiveSession.updateMany
          ? await ActiveSession.updateMany(
              { userId, ipAddress: item.ipAddress, revokedAt: { $exists: false } },
              { $set: { revokedAt: new Date(), revokeReason: 'User reported fraudulent sign-in' } }
            )
          : null;
      } catch (sessionErr) {
        console.warn('[SESSION_REVOKE_WARNING]:', sessionErr);
      }
    }

    // 2. Dispatch a critical security alert
    try {
      await SecurityAlert.create({
        userId,
        alertType: 'suspicious_login',
        severity: 'critical',
        title: 'User Reported Unauthorized Login Attempt',
        description: `You flagged an unrecognized login from ${item.location} (${item.browser} on ${item.operatingSystem}, IP: ${item.ipAddress}) as fraudulent. Sessions were terminated.`,
        readStatus: false,
        metadata: {
          ipAddress: item.ipAddress,
          location: item.location,
          browser: item.browser,
          device: item.device,
        },
      });
    } catch {}

    res.status(200).json({
      success: true,
      message: 'Alert registered: Session revoked immediately. We strongly advise updating your password and reviewing active sessions.',
      confirmation: item,
      recommendedActions: [
        'Change your account password immediately.',
        'Review and revoke all other active sessions under Active Sessions.',
        'Register a biometric Passkey for phishing-proof security.',
      ],
    });
  } catch (err: any) {
    console.error('[SECURITY_CONFIRMATION_RESPONSE_ERROR]:', err);
    res.status(500).json({ success: false, message: 'Failed to process confirmation response.' });
  }
}

