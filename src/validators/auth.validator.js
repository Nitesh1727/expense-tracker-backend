import { z } from 'zod';
import { AVATAR_KEYS } from '../constants/avatarPresets.js';

// E.164-ish: + followed by 8-15 digits. Good enough for v1 without a full phone-parsing library.
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format, e.g. +919876543210');
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().trim().min(1).max(50);

const requestOtpSchema = z.object({
  body: z.object({ phone: phoneSchema }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
  }),
});

const signupEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema.optional(),
  }),
});

const loginEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

// No `email` — an account's email is fixed once set (it's the verified
// login identity, see auth.service.js's verifyEmail), not an editable
// contact-info field. Every other field here is optional since this same
// endpoint backs several different partial updates (profile edits, the
// Settings monthly-report toggle).
const updateProfileSchema = z.object({
  body: z.object({
    name: nameSchema.optional(),
    monthlyReportEnabled: z.boolean().optional(),
    avatar: z.enum(AVATAR_KEYS).optional(),
  }),
});

const codeSchema = z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits');

// Authenticated (req.userId identifies which account) — no email in the
// body, unlike password reset, which happens before login.
const verifyEmailSchema = z.object({
  body: z.object({ code: codeSchema }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email: emailSchema }),
});

const resetPasswordSchema = z.object({
  body: z.object({ email: emailSchema, code: codeSchema, newPassword: passwordSchema }),
});

// Authenticated (Settings → Account) — proves ownership via the current
// password instead of an emailed code, unlike resetPassword above.
const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: passwordSchema }),
});

export {
  requestOtpSchema,
  verifyOtpSchema,
  signupEmailSchema,
  loginEmailSchema,
  updateProfileSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
