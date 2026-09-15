const rateLimit = require('express-rate-limit');

/** 5 OTP requests per phone-adjacent window is plenty for legitimate use, cheap to abuse otherwise. */
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many OTP requests, please try again later' } },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later' } },
});

module.exports = { otpRequestLimiter, otpVerifyLimiter };
