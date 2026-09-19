import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Was `Otp` / `otps` (phone login only) — generalized to also back email
 * verification and password reset once those needed the same "hashed code,
 * short TTL, capped attempts" mechanics. `purpose` keeps the three kinds
 * from ever matching each other's lookups even if the same phone/email is
 * mid-flow on more than one at once. Renaming the collection (rather than
 * keeping the `otps` name) is safe with no migration — every document here
 * is short-lived (see the TTL index below), so old `otps` documents just
 * expire out on their own and are never read by the new name.
 */
const verificationCodeSchema = new Schema(
  {
    phone: { type: String, index: true },
    email: { type: String, index: true },
    purpose: {
      type: String,
      enum: ['phone-login', 'email-verify', 'password-reset'],
      required: true,
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index — MongoDB auto-deletes the document once expiresAt passes, no cleanup job needed.
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model('VerificationCode', verificationCodeSchema);
