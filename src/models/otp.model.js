import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index — MongoDB auto-deletes the document once expiresAt passes, no cleanup job needed.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model('Otp', otpSchema);
