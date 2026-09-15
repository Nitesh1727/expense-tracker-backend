const { z } = require('zod');

// E.164-ish: + followed by 8-15 digits. Good enough for v1 without a full phone-parsing library.
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format, e.g. +919876543210');

const requestOtpSchema = z.object({
  body: z.object({ phone: phoneSchema }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
  }),
});

module.exports = { requestOtpSchema, verifyOtpSchema };
