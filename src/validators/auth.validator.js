const { z } = require('zod');

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

// Every field optional — this is used both for the post-signup "complete your
// profile" step (skippable, partial) and for editing profile fields later.
const updateProfileSchema = z.object({
  body: z.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  }),
});

module.exports = {
  requestOtpSchema,
  verifyOtpSchema,
  signupEmailSchema,
  loginEmailSchema,
  updateProfileSchema,
};
