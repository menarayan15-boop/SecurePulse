import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAccountPasswordSummary } from '../controllers/passwordHealthController.js';

const router = Router();

// Protect all password health routes with existing auth middleware
router.use(requireAuth);

router.get('/account-summary', getAccountPasswordSummary);

export default router;

