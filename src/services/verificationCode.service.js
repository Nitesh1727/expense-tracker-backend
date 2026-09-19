import VerificationCode from '../models/verificationCode.model.js';
import ApiError from '../utils/ApiError.js';
import { hash, compareHash } from '../utils/hash.util.js';
import { generateOtpCode } from '../utils/otp.util.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Shared core behind phone login OTP, email verification, and password
 * reset — same "hashed code, short TTL, capped wrong-attempts" mechanics for
 * all three, parameterized by which identifier field (`phone` or `email`)
 * and `purpose` keeps them from colliding. Returns the plaintext code so the
 * caller can send it (SMS or email) — never stored or logged in plaintext.
 */
async function issueCode({ field, value, purpose, ttlMs = DEFAULT_TTL_MS }) {
  const code = generateOtpCode();
  const codeHash = await hash(code);

  await VerificationCode.create({ [field]: value, purpose, codeHash, expiresAt: new Date(Date.now() + ttlMs) });
  return code;
}

/** Throws on missing/expired/wrong code or too many attempts; deletes the code once it verifies successfully. */
async function verifyCode({ field, value, purpose, code }) {
  const record = await VerificationCode.findOne({ [field]: value, purpose }).sort({ createdAt: -1 });

  if (!record) {
    throw new ApiError(400, 'No code was requested — request a new one');
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(400, 'Code has expired, request a new one');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts, request a new code');
  }

  const isValid = await compareHash(code, record.codeHash);

  if (!isValid) {
    record.attempts += 1;
    await record.save();
    throw new ApiError(400, 'Incorrect code');
  }

  await record.deleteOne();
}

export { issueCode, verifyCode };
