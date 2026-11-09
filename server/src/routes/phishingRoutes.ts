import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { scanUrl, scanContent, getScanHistory } from '../controllers/phishingController.js';

const router = Router();

// Protect all phishing scanner routes with existing auth middleware
router.use(requireAuth);

router.post('/scan-url', scanUrl);
router.post('/scan-content', scanContent);
router.get('/history', getScanHistory);

export default router;

