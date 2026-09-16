const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { otpRequestLimiter, otpVerifyLimiter, emailAuthLimiter } = require('../middleware/rateLimiter.middleware');
const {
  requestOtpSchema,
  verifyOtpSchema,
  signupEmailSchema,
  loginEmailSchema,
  updateProfileSchema,
} = require('../validators/auth.validator');

const router = Router();

router.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/signup/email', emailAuthLimiter, validate(signupEmailSchema), authController.signupEmail);
router.post('/login/email', emailAuthLimiter, validate(loginEmailSchema), authController.loginEmail);
router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), authController.updateMe);
router.delete('/me', requireAuth, authController.deleteMe);

module.exports = router;
