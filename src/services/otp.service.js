import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import * as verificationCodeService from './verificationCode.service.js';

/**
 * SMS sending is behind this one function so swapping in a real provider
 * (Twilio, MSG91, ...) later is a one-function change. Dev mode logs the
 * code instead of sending it — there's no provider configured yet. Left
 * running even though the frontend currently only surfaces email+password
 * (see frontend's WelcomeScreen doc comment) — re-adding the phone UI later
 * needs no backend work.
 */
async function sendSms(phone, code) {
  if (env.SMS_PROVIDER === 'dev') {
    console.log(`[otp:dev] SMS to ${phone}: your code is ${code}`);
    return;
  }
  throw new ApiError(500, `SMS provider "${env.SMS_PROVIDER}" is not implemented`);
}

async function requestOtp(phone) {
  const code = await verificationCodeService.issueCode({ field: 'phone', value: phone, purpose: 'phone-login' });
  await sendSms(phone, code);

  // Dev convenience only — never expose the code in a response in production.
  return env.NODE_ENV === 'production' ? {} : { devCode: code };
}

async function verifyOtp(phone, code) {
  await verificationCodeService.verifyCode({ field: 'phone', value: phone, purpose: 'phone-login', code });
}

export { requestOtp, verifyOtp };
