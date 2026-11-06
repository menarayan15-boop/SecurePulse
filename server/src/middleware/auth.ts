import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyAccessToken } from '../utils/crypto.js';
import { User } from '../models/User.js';
import { ActiveSession } from '../models/ActiveSession.js';
import { extractEnvironmentInfo } from '../services/environmentDetection.js';

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    req.envInfo = extractEnvironmentInfo(req);

    // Look for token in HTTP-only cookie first, then Bearer header
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'Account not found. Please log in again.' });
      return;
    }

    if (user.accountStatus === 'locked') {
      res.status(403).json({
        success: false,
        message: 'Account is locked for emergency security. Please complete account recovery.',
        isLocked: true,
      });
      return;
    }

    // Check session validity if sessionId cookie or header is present
    const sessionId = req.cookies?.sessionId || (req.headers['x-session-id'] as string);
    if (sessionId) {
      const activeSession = await ActiveSession.findOne({
        sessionToken: sessionId,
        userId: user._id,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      });

      if (!activeSession) {
        res.status(401).json({
          success: false,
          message: 'Your session has been terminated or expired. Please log in again.',
          sessionTerminated: true,
        });
        return;
      }

      // Update last active timestamp on session
      activeSession.lastActiveAt = new Date();
      activeSession.ipAddress = req.envInfo.ipAddress;
      await activeSession.save().catch(() => {});
      req.sessionId = sessionId;
    }

    req.user = user.toObject();
    req.userId = user._id.toString();
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Session token expired.', tokenExpired: true });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
}
