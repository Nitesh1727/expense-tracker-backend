import rateLimit from 'express-rate-limit';

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

/** Same shape as otpVerifyLimiter — guards email login against password guessing. */
const emailAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later' } },
});

/** Same shapes as the phone OTP limiters above, applied to email verification/password-reset codes. */
const emailCodeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later' } },
});

const emailCodeVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later' } },
});

export { otpRequestLimiter, otpVerifyLimiter, emailAuthLimiter, emailCodeRequestLimiter, emailCodeVerifyLimiter };
