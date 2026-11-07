import { Router } from 'express';
import {
  getSecurityOverview,
  getSecurityAlerts,
  markAlertRead,
  clearAllAlerts,
  getHealthScore,
  emergencyLockAccount,
  requestAccountRecovery,
  completeAccountRecovery,
} from '../controllers/securityController.js';
import { requireAuth } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public recovery routes (when account is locked and user cannot provide ordinary auth session)
router.post('/recover/request', otpLimiter, requestAccountRecovery);
router.post('/recover/verify', otpLimiter, completeAccountRecovery);

// Authenticated routes
router.use(requireAuth);

router.get('/overview', getSecurityOverview);
router.get('/alerts', getSecurityAlerts);
router.put('/alerts/:id/read', markAlertRead);
router.post('/alerts/clear-all', clearAllAlerts);
router.get('/health-score', getHealthScore);
router.post('/emergency-lock', emergencyLockAccount);

export default router;

