import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateTheme,
  updateSecuritySettings,
  deleteAccount,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/theme', updateTheme);
router.put('/security-settings', updateSecuritySettings);
router.delete('/account', deleteAccount);

export default router;

