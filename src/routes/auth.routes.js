import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  otpRequestLimiter,
  otpVerifyLimiter,
  emailAuthLimiter,
  emailCodeRequestLimiter,
  emailCodeVerifyLimiter,
} from '../middleware/rateLimiter.middleware.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  signupEmailSchema,
  loginEmailSchema,
  updateProfileSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const { Router } = express;

const router = Router();

router.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/signup/email', emailAuthLimiter, validate(signupEmailSchema), authController.signupEmail);
router.post('/login/email', emailAuthLimiter, validate(loginEmailSchema), authController.loginEmail);
router.post('/verify-email/resend', requireAuth, emailCodeRequestLimiter, authController.resendVerification);
router.post('/verify-email', requireAuth, emailCodeVerifyLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/password/forgot',
  emailCodeRequestLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/password/reset', emailCodeVerifyLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post(
  '/password/change',
  requireAuth,
  emailAuthLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), authController.updateMe);
router.delete('/me', requireAuth, authController.deleteMe);

export default router;
