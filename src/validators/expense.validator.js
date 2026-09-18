import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createExpenseSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(120),
    categoryId: objectId,
    date: z.coerce.date().optional(),
  }),
});

const updateExpenseSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    amount: z.number().positive().optional(),
    description: z.string().trim().min(1).max(120).optional(),
    categoryId: objectId.optional(),
    date: z.coerce.date().optional(),
  }),
});

const listExpensesSchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    categoryId: objectId.optional(),
    // Matches description (case-insensitive, partial) or an exact amount —
    // see expense.service.js buildSearchClause for why those are the two
    // interpretations of one search box rather than separate params.
    q: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

const dailySummarySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(60).default(15),
  }),
});

const exportQuerySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    categoryId: objectId.optional(),
  }),
});

export { createExpenseSchema, updateExpenseSchema, listExpensesSchema, dailySummarySchema, exportQuerySchema, objectId };
