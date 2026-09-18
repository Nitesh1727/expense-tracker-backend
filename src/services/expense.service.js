import mongoose from 'mongoose';
import Expense from '../models/expense.model.js';
import Category from '../models/category.model.js';
import ApiError from '../utils/ApiError.js';

// Mongo treats a $regex value as a pattern, not a literal string — an
// unescaped search term containing regex metacharacters (e.g. "coffee (2)")
// would either throw or match something the user never typed.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One search box, two interpretations: match `description` as a
 * case-insensitive partial string, OR `amount` as an exact number if `q`
 * parses as one (e.g. searching "500" finds every ₹500 expense exactly, not
 * expenses merely *containing* "500" in the amount — a partial/substring
 * match on a number is rarely what someone means by "search for 500 rupees").
 * Both conditions apply (OR'd together) so a query that happens to look
 * numeric still also matches a description containing those digits.
 */
function buildSearchClause(q) {
  if (!q) return null;
  const conditions = [{ description: { $regex: escapeRegExp(q), $options: 'i' } }];
  const asNumber = Number(q);
  if (!Number.isNaN(asNumber)) conditions.push({ amount: asNumber });
  return { $or: conditions };
}

async function assertCategoryOwnedByUser(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) {
    throw new ApiError(400, 'Category not found');
  }
  return category;
}

async function createExpense(userId, { amount, description, categoryId, date }) {
  const category = await assertCategoryOwnedByUser(userId, categoryId);
  const expense = await Expense.create({
    userId,
    amount,
    description,
    category: categoryId,
    date: date ?? new Date(),
  });
  // Reuses the category doc already fetched for ownership validation instead
  // of a second round-trip via .populate('category') (which would re-fetch
  // the exact same document by _id) — one fewer DB query per create, same
  // response shape. Built as a plain object rather than mutating the
  // Mongoose document's `category` path directly, since that path is typed
  // as an ObjectId and a raw assignment would get cast back down to just the
  // id instead of keeping the populated fields.
  const result = expense.toObject();
  result.category = category.toObject();
  return result;
}

async function listExpenses(userId, { from, to, categoryId, categoryIds, q, page, limit }) {
  const filter = { userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    // $lt (exclusive), not $lte — matches the [start, end) convention used
    // everywhere else (dateRange.util.js, getDailySummary). This used to be
    // $lte, and DayTile's per-day expand fetch passes `to` as the exclusive
    // start of the *next* day — an expense whose date picker produced an
    // exact-midnight timestamp (routine: showDatePicker returns local
    // midnight) landed exactly on that boundary and, with $lte, matched
    // both the day it belonged to *and* the day before it. Caught live: an
    // expense dated the 14th was also showing up under the 13th.
    if (to) filter.date.$lt = to;
  }
  // categoryIds (multi-select) takes precedence over categoryId (single) —
  // see the validator for why both exist.
  if (categoryIds?.length) {
    filter.category = { $in: categoryIds };
  } else if (categoryId) {
    filter.category = categoryId;
  }
  const searchClause = buildSearchClause(q);
  if (searchClause) Object.assign(filter, searchClause);

  // Same filter as find()/countDocuments() above, but aggregate() doesn't go
  // through Mongoose's query-level casting — userId/category need to already
  // be real ObjectIds here, or $match silently matches zero documents.
  const aggregateFilter = { ...filter, userId: new mongoose.Types.ObjectId(userId) };
  if (categoryIds?.length) {
    aggregateFilter.category = { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)) };
  } else if (categoryId) {
    aggregateFilter.category = new mongoose.Types.ObjectId(categoryId);
  }

  const [items, total, sumResult] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category'),
    Expense.countDocuments(filter),
    // Sum across every matching document, not just this page — the History
    // screen's "Total" footer needs the true total for the filter regardless
    // of how many pages have been scrolled/loaded client-side.
    Expense.aggregate([{ $match: aggregateFilter }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
  ]);

  return { items, page, limit, total, totalAmount: sumResult[0]?.sum ?? 0 };
}

async function getExpenseById(userId, id) {
  const expense = await Expense.findOne({ _id: id, userId }).populate('category');
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }
  return expense;
}

async function updateExpense(userId, id, updates) {
  if (updates.categoryId) {
    await assertCategoryOwnedByUser(userId, updates.categoryId);
  }

  const { categoryId, ...rest } = updates;
  const patch = categoryId ? { ...rest, category: categoryId } : rest;

  const expense = await Expense.findOneAndUpdate({ _id: id, userId }, patch, { new: true }).populate('category');

  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }
  return expense;
}

async function deleteExpense(userId, id) {
  const result = await Expense.findOneAndDelete({ _id: id, userId });
  if (!result) {
    throw new ApiError(404, 'Expense not found');
  }
}

async function deleteAllForUser(userId) {
  await Expense.deleteMany({ userId });
}

/**
 * Powers the Home feed's collapsible day-tiles: one row per calendar day
 * that has at least one expense, newest first, paginated by NUMBER OF DAYS
 * (not number of expenses) — so a page boundary never splits a single day's
 * total across two pages. Tiles start collapsed showing just this total;
 * expanding one fetches that day's actual items via listExpenses/findInRange
 * with a one-day {from, to} range, rather than embedding items here.
 *
 * Buckets in IST via $dateTrunc, matching analytics.service.js — see
 * backend/src/utils/dateRange.util.js for why UTC bucketing was wrong.
 */
async function getDailySummary(userId, { from, to, page, limit }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const match = { userId: userObjectId };
  // Powers the Search screen's date-only results view (grouped day-tiles for
  // a picked range) — Home's own call site omits from/to entirely, which
  // keeps its existing "full history" behavior unchanged.
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lt = to; // exclusive, same convention as listExpenses
  }

  const [result] = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateTrunc: { date: '$date', unit: 'day', timezone: 'Asia/Kolkata' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    {
      $facet: {
        days: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const days = result.days.map((d) => ({ date: d._id, total: d.total, count: d.count }));
  const totalDays = result.totalCount[0]?.count ?? 0;

  return { days, page, limit, totalDays, hasMore: page * limit < totalDays };
}

/** Used by both analytics and export — same filter shape as listExpenses, no pagination. */
async function findInRange(userId, { from, to, categoryId } = {}) {
  const filter = { userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lt = to; // exclusive — see listExpenses for why
  }
  if (categoryId) filter.category = categoryId;

  return Expense.find(filter).sort({ date: -1 }).populate('category');
}

export { createExpense, listExpenses, getExpenseById, updateExpense, deleteExpense, deleteAllForUser, getDailySummary, findInRange };
