import { Router } from 'express';
import {
  getLoginHistory,
  getLoginHistoryById,
  exportLoginHistoryCsv,
} from '../controllers/loginHistoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getLoginHistory);
router.get('/export', exportLoginHistoryCsv);
router.get('/:id', getLoginHistoryById);

export default router;

