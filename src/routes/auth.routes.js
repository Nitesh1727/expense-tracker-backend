import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { otpRequestLimiter, otpVerifyLimiter, emailAuthLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  signupEmailSchema,
  loginEmailSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const { Router } = express;

const router = Router();

router.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/signup/email', emailAuthLimiter, validate(signupEmailSchema), authController.signupEmail);
router.post('/login/email', emailAuthLimiter, validate(loginEmailSchema), authController.loginEmail);
router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), authController.updateMe);
router.delete('/me', requireAuth, authController.deleteMe);

export default router;
