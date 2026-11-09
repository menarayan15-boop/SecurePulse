import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPendingConfirmations,
  respondToConfirmation,
} from '../controllers/securityConfirmationController.js';

const router = Router();

// Protect all confirmation routes with existing auth middleware
router.use(requireAuth);

router.get('/pending', getPendingConfirmations);
router.post('/:id/respond', respondToConfirmation);

export default router;

