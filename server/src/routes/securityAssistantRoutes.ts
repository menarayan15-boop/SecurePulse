import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  chatWithAssistant,
  getAssistantSecuritySummary,
} from '../controllers/securityAssistantController.js';

const router = Router();

// Protect all assistant routes with existing auth middleware
router.use(requireAuth);

router.post('/chat', chatWithAssistant);
router.get('/context', getAssistantSecuritySummary);

export default router;

