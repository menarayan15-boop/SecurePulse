import { Router } from 'express';
import {
  getPasskeyRegistrationOptions,
  completePasskeyRegistration,
  getPasskeyAuthOptions,
  verifyPasskeyAuth,
  listUserPasskeys,
  renamePasskey,
  deletePasskey,
} from '../controllers/passkeyController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public passkey authentication routes (for login)
router.get('/auth-options', authLimiter, getPasskeyAuthOptions);
router.post('/verify-auth', authLimiter, verifyPasskeyAuth);

// Authenticated passkey management routes
router.use(requireAuth);

router.get('/register-options', getPasskeyRegistrationOptions);
router.post('/register', completePasskeyRegistration);
router.get('/list', listUserPasskeys);
router.put('/:id', renamePasskey);
router.delete('/:id', deletePasskey);

export default router;

