import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// Comma-separated in the query string ("categoryIds=<id>,<id>"), not
// repeated params — simpler to build from the client and to validate here
// (each piece still has to be a real ObjectId, same as the singular param).
const objectIdList = z
  .string()
  .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(objectId).min(1));

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
    // Both kept — categoryId (singular) is still what DayTile's per-day
    // fetch and other single-category call sites use; categoryIds (plural)
    // is additive for the History Filters sheet's multi-select. A request
    // sending both is unusual but not ambiguous — the service prefers
    // categoryIds when present.
    categoryId: objectId.optional(),
    categoryIds: objectIdList.optional(),
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
    categoryId: objectId.optional(),
    categoryIds: objectIdList.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(60).default(15),
  }),
});

const exportQuerySchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    categoryId: objectId.optional(),
    // Human period label the Analytics screen already shows on-screen (e.g.
    // "September 2026") — reused verbatim as the workbook's sheet name and
    // filename rather than the backend re-deriving "is this a day/week/
    // month/year or a custom range" from from/to alone.
    label: z.string().trim().max(60).optional(),
  }),
});

export { createExpenseSchema, updateExpenseSchema, listExpensesSchema, dailySummarySchema, exportQuerySchema, objectId };
