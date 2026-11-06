import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { logSecurityAudit, createInAppAlert } from '../services/notificationService.js';

export async function getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const currentSessionId = req.sessionId;

    const sessions = await ActiveSession.find({
      userId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    const formatted = sessions.map((s: any) => ({
      id: s._id,
      sessionToken: s.sessionToken,
      browser: s.browser,
      operatingSystem: s.operatingSystem,
      deviceType: s.deviceType,
      ipAddress: s.ipAddress,
      city: s.city,
      state: s.state,
      country: s.country,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent: currentSessionId ? s.sessionToken === currentSessionId : false,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve active sessions.' });
  }
}

export async function terminateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const session = await ActiveSession.findOne({ _id: id, userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found.' });
      return;
    }

    session.revokedAt = new Date();
    await session.save();

    const isCurrentSession = session.sessionToken === req.sessionId;
    if (isCurrentSession) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('sessionId');
    }

    await createInAppAlert({
      userId,
      alertType: 'session_terminated',
      severity: 'low',
      title: 'Session Terminated',
      description: `Active session on ${session.browser} (${session.ipAddress}) was terminated.`,
    });

    await logSecurityAudit({
      userId,
      action: 'Session Terminated',
      eventType: 'session',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
      relevantMetadata: { sessionId: id, isCurrentSession },
    });

    res.status(200).json({
      success: true,
      message: 'Session has been invalidated.',
      isCurrentSession,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to terminate session.' });
  }
}

export async function terminateOtherSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const currentSessionId = req.sessionId;

    const query: Record<string, any> = {
      userId,
      revokedAt: { $exists: false },
    };

    if (currentSessionId) {
      query.sessionToken = { $ne: currentSessionId };
    }

    const result = await ActiveSession.updateMany(query, { revokedAt: new Date() });

    await createInAppAlert({
      userId,
      alertType: 'session_terminated',
      severity: 'medium',
      title: 'All Other Sessions Terminated',
      description: `Terminated ${result.modifiedCount} other active sessions across your devices.`,
    });

    await logSecurityAudit({
      userId,
      action: 'Terminated Other Sessions',
      eventType: 'session',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
      relevantMetadata: { count: result.modifiedCount },
    });

    res.status(200).json({
      success: true,
      message: `Successfully logged out of ${result.modifiedCount} other session(s).`,
      count: result.modifiedCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to terminate other sessions.' });
  }
}

export async function terminateAllSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    await ActiveSession.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    await createInAppAlert({
      userId,
      alertType: 'session_terminated',
      severity: 'high',
      title: 'All Active Sessions Terminated',
      description: 'All sessions across all devices were terminated. Full re-authentication required.',
    });

    await logSecurityAudit({
      userId,
      action: 'Terminated All Sessions',
      eventType: 'session',
      ipAddress: req.envInfo?.ipAddress,
      browser: req.envInfo?.browserName,
    });

    res.status(200).json({
      success: true,
      message: 'All sessions terminated successfully. You have been logged out.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to terminate all sessions.' });
  }
}
