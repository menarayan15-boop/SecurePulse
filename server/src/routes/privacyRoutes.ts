import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPrivacyOverview,
  updatePrivacyPreferences,
  exportUserData,
  cleanupOldTelemetry,
  requestAccountDeletion,
} from '../controllers/privacyController.js';

const router = Router();

// Protect all privacy routes with existing auth middleware
router.use(requireAuth);

router.get('/overview', getPrivacyOverview);
router.put('/preferences', updatePrivacyPreferences);
router.get('/export', exportUserData);
router.post('/retention/cleanup', cleanupOldTelemetry);
router.post('/delete-request', requestAccountDeletion);

export default router;

