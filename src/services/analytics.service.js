import mongoose from 'mongoose';
import Expense from '../models/expense.model.js';
import Category from '../models/category.model.js';
import { getDateRange, getTrendBucketUnit } from '../utils/dateRange.util.js';

/**
 * Aggregation pipelines rather than pulling expenses into Node and summing
 * in JS — stays correct and fast as data grows, and pushes the work to
 * where the {userId, date} index already lives.
 */
async function getSummary(userId, period, anchor) {
  const { start, end } = getDateRange(period, anchor);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const grouped = await Expense.aggregate([
    { $match: { userId: userObjectId, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const categories = await Category.find({ userId });
  const categoryById = new Map(categories.map((c) => [c._id.toString(), c]));

  const byCategory = grouped
    .map((g) => {
      const category = categoryById.get(g._id.toString());
      return category
        ? {
            category: { id: category._id, name: category.name, icon: category.icon, color: category.color },
            total: g.total,
            count: g.count,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const total = byCategory.reduce((sum, c) => sum + c.total, 0);

  return { period, range: { start, end }, total, byCategory };
}

async function getTrend(userId, period, anchor) {
  const { start, end } = getDateRange(period, anchor);
  const unit = getTrendBucketUnit(period);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const buckets = await Expense.aggregate([
    { $match: { userId: userObjectId, date: { $gte: start, $lt: end } } },
    {
      $group: {
        // 'Asia/Kolkata' to match getDateRange's IST assumption (see dateRange.util.js) —
        // grouping in UTC here while filtering IST-aligned bounds above would put
        // expenses in the wrong bucket near day boundaries.
        _id: { $dateTrunc: { date: '$date', unit, timezone: 'Asia/Kolkata' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    period,
    range: { start, end },
    bucketUnit: unit,
    series: buckets.map((b) => ({ bucket: b._id, total: b.total })),
  };
}

export { getSummary, getTrend };
