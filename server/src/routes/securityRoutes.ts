import { Router } from 'express';
import {
  getSecurityOverview,
  getSecurityAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
  clearAllAlerts,
  getAlertPreferences,
  updateAlertPreferences,
  getHealthScore,
  emergencyLockAccount,
  requestAccountRecovery,
  completeAccountRecovery,
  getRiskAnalysisOverview,
  getImpossibleTravelData,
  resolveImpossibleTravel,
  getSecurityTimelineData,
  exportSecurityTimelineData,
  getAccountProtectionData,
  executeEmergencyFreezeAction,
  getRecoveryCodesStatus,
  generateNewRecoveryCodes,
  verifyRecoveryCode,
} from '../controllers/securityController.js';
import { requireAuth } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public recovery routes (when account is locked and user cannot provide ordinary auth session)
router.post('/recover/request', otpLimiter, requestAccountRecovery);
router.post('/recover/verify', otpLimiter, completeAccountRecovery);
router.post('/recover/backup-code', otpLimiter, verifyRecoveryCode);

// Authenticated routes
router.use(requireAuth);

router.get('/overview', getSecurityOverview);
router.get('/health-score', getHealthScore);
router.post('/emergency-lock', emergencyLockAccount);

// FEATURE 1: AI Risk Analysis
router.get('/risk-analysis', getRiskAnalysisOverview);

// FEATURE 2: Impossible Travel
router.get('/impossible-travel', getImpossibleTravelData);
router.put('/impossible-travel/:id/resolve', resolveImpossibleTravel);

// FEATURE 3: Real-Time Security Alert Center
router.get('/alerts', getSecurityAlerts);
router.put('/alerts/:id/read', markAlertRead);
router.post('/alerts/mark-all-read', markAllAlertsRead);
router.delete('/alerts/:id', deleteAlert);
router.post('/alerts/clear-all', clearAllAlerts);
router.get('/alerts/preferences', getAlertPreferences);
router.put('/alerts/preferences', updateAlertPreferences);

// FEATURE 5: Account Takeover (ATO) Protection
router.get('/account-protection', getAccountProtectionData);
router.post('/account-protection/emergency-freeze', executeEmergencyFreezeAction);

// FEATURE 6: Personal Security Timeline
router.get('/timeline', getSecurityTimelineData);
router.get('/timeline/export', exportSecurityTimelineData);

// FEATURE 7: Emergency Recovery Codes
router.get('/recovery/codes', getRecoveryCodesStatus);
router.post('/recovery/codes/generate', generateNewRecoveryCodes);
router.post('/recovery/codes/verify', verifyRecoveryCode);

export default router;

