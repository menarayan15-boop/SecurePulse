import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getTravelStatus,
  getTravelPlanDetails,
  createTravelPlan,
  updateTravelPlan,
  deleteTravelPlan,
  toggleTravelMode,
} from '../controllers/travelController.js';

const router = Router();

// Protect all travel routes with existing auth middleware
router.use(requireAuth);

router.get('/status', getTravelStatus);
router.get('/plan/:id', getTravelPlanDetails);
router.post('/plan', createTravelPlan);
router.put('/plan/:id', updateTravelPlan);
router.delete('/plan/:id', deleteTravelPlan);
router.put('/toggle', toggleTravelMode);

export default router;
