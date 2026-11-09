import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getTravelStatus,
  createTravelPlan,
  deleteTravelPlan,
  toggleTravelMode,
} from '../controllers/travelController.js';

const router = Router();

// Protect all travel routes with existing auth middleware
router.use(requireAuth);

router.get('/status', getTravelStatus);
router.post('/plan', createTravelPlan);
router.delete('/plan/:id', deleteTravelPlan);
router.put('/toggle', toggleTravelMode);

export default router;

