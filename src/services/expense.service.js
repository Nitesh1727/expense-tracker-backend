const mongoose = require('mongoose');
const Expense = require('../models/expense.model');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');

async function assertCategoryOwnedByUser(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) {
    throw new ApiError(400, 'Category not found');
  }
}

async function createExpense(userId, { amount, description, categoryId, date }) {
  await assertCategoryOwnedByUser(userId, categoryId);
  const expense = await Expense.create({
    userId,
    amount,
    description,
    category: categoryId,
    date: date ?? new Date(),
  });
  return expense.populate('category');
}

async function listExpenses(userId, { from, to, categoryId, page, limit }) {
  const filter = { userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (categoryId) filter.category = categoryId;

  const [items, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category'),
    Expense.countDocuments(filter),
  ]);

  return { items, page, limit, total };
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
async function getDailySummary(userId, { page, limit }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [result] = await Expense.aggregate([
    { $match: { userId: userObjectId } },
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
    if (to) filter.date.$lte = to;
  }
  if (categoryId) filter.category = categoryId;

  return Expense.find(filter).sort({ date: -1 }).populate('category');
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  deleteAllForUser,
  getDailySummary,
  findInRange,
};
