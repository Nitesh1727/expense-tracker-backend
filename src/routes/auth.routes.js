const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter.middleware');
const { requestOtpSchema, verifyOtpSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.get('/me', requireAuth, authController.getMe);
router.delete('/me', requireAuth, authController.deleteMe);

module.exports = router;
