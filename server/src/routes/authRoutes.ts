import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  verifyLoginOtp,
  resendOtp,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/verify-email', otpLimiter, verifyEmail);
router.post('/login', authLimiter, login);
router.post('/verify-login-otp', otpLimiter, verifyLoginOtp);
router.post('/resend-otp', otpLimiter, resendOtp);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', otpLimiter, resetPassword);

export default router;
