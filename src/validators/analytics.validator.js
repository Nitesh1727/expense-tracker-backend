const { z } = require('zod');

const summarySchema = z.object({
  query: z.object({
    period: z.enum(['day', 'week', 'month', 'year']),
    anchor: z.coerce.date().optional(),
  }),
});

const trendSchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'year']),
    anchor: z.coerce.date().optional(),
  }),
});

module.exports = { summarySchema, trendSchema };
