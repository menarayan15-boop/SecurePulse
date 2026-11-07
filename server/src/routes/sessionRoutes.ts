import { Router } from 'express';
import {
  getActiveSessions,
  terminateSession,
  terminateOtherSessions,
  terminateAllSessions,
} from '../controllers/sessionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getActiveSessions);
router.delete('/others', terminateOtherSessions);
router.delete('/all', terminateAllSessions);
router.delete('/:id', terminateSession);

export default router;

