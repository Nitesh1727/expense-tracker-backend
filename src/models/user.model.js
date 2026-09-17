import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/** See backend/docs/DATABASE.md for field-by-field rationale. */
const userSchema = new Schema(
  {
    name: { type: String, trim: true },
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
