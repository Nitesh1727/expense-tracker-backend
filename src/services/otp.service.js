const Otp = require('../models/otp.model');
const ApiError = require('../utils/ApiError');
const { hash, compareHash } = require('../utils/hash.util');
const { generateOtpCode } = require('../utils/otp.util');
const env = require('../config/env');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * SMS sending is behind this one function so swapping in a real provider
 * (Twilio, MSG91, ...) later is a one-function change. Dev mode logs the
 * code instead of sending it — there's no provider configured yet.
 */
async function sendSms(phone, code) {
  if (env.SMS_PROVIDER === 'dev') {
    console.log(`[otp:dev] SMS to ${phone}: your code is ${code}`);
    return;
  }
  throw new ApiError(500, `SMS provider "${env.SMS_PROVIDER}" is not implemented`);
}

async function requestOtp(phone) {
  const code = generateOtpCode();
  const codeHash = await hash(code);

  await Otp.create({ phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  await sendSms(phone, code);

  // Dev convenience only — never expose the code in a response in production.
  return env.NODE_ENV === 'production' ? {} : { devCode: code };
}

async function verifyOtp(phone, code) {
  const otp = await Otp.findOne({ phone }).sort({ createdAt: -1 });

  if (!otp) {
    throw new ApiError(400, 'No OTP was requested for this phone number');
  }

  if (otp.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired, request a new one');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts, request a new OTP');
  }

  const isValid = await compareHash(code, otp.codeHash);

  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, 'Incorrect OTP');
  }

  await otp.deleteOne();
}

module.exports = { requestOtp, verifyOtp };
