import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AVATAR_KEYS } from '../constants/avatarPresets.js';

const { Schema, model } = mongoose;

/** See backend/docs/DATABASE.md for field-by-field rationale. */
const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    // A key the frontend maps to a bundled cartoon illustration
    // (assets/avatars/) — not a free-form string or an uploaded image, see
    // avatarPresets.js for why. null until the user picks one; the
    // frontend falls back to their name's first letter until then.
    avatar: { type: String, enum: AVATAR_KEYS, default: null },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    passwordHash: { type: String, select: false },
    authProvider: {
      type: String,
      enum: ['email', 'phone', 'google'],
      required: true,
    },
    googleId: { type: String, sparse: true },
    currency: { type: String, default: 'INR' },
    // Only meaningful for authProvider: 'email' — a phone-login account is
    // implicitly verified by having proven ownership of the phone via OTP.
    emailVerified: { type: Boolean, default: false },
    // Default on, matching "opt-out, not opt-in" for the monthly report
    // per explicit product decision — a user can flip this off in Settings,
    // or via the no-login-required unsubscribe link every report email
    // carries (see routes/public.routes.js).
    monthlyReportEnabled: { type: Boolean, default: true },
    // Opaque per-user token for that unsubscribe link — generated once, at
    // creation, rather than derived from the user id, so it can't be
    // guessed/enumerated from a leaked report email.
    unsubscribeToken: { type: String, unique: true, default: () => crypto.randomBytes(24).toString('hex') },
  },
  { timestamps: true },
);

// `select: false` on passwordHash only suppresses it in *query* results — a
// document that's already loaded (what .create() returns, or after login
// explicitly does .select('+passwordHash') to check the password) still has
// it in memory and would serialize it into any `res.json({ user })`. Caught
// in manual testing: signup and login responses were both leaking the hash.
// This transform is the one place that guarantees it never reaches a
// response, regardless of how the document got loaded.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export default model('User', userSchema);
