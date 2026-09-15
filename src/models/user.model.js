const { Schema, model } = require('mongoose');

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

module.exports = model('User', userSchema);
