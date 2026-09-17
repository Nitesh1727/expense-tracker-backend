import crypto from 'node:crypto';

/** 6-digit numeric code, zero-padded (e.g. "042317"). */
function generateOtpCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export { generateOtpCode };
