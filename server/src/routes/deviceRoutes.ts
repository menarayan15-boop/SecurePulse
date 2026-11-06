import { Router } from 'express';
import {
  getTrustedDevices,
  trustCurrentDevice,
  removeTrustedDevice,
  removeAllTrustedDevices,
} from '../controllers/deviceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getTrustedDevices);
router.post('/trust', trustCurrentDevice);
router.delete('/:id', removeTrustedDevice);
router.delete('/', removeAllTrustedDevices);

export default router;
