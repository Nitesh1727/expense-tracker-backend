import Category from '../models/category.model.js';
import Expense from '../models/expense.model.js';
import ApiError from '../utils/ApiError.js';
import { DEFAULT_CATEGORIES } from '../constants/categoryPresets.js';

/** Called once, right after a new user is created — see auth.service.js. */
async function seedDefaultCategories(userId) {
  const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, userId }));
  return Category.insertMany(docs);
}

async function listCategories(userId) {
  return Category.find({ userId }).sort({ createdAt: 1 });
}

async function createCategory(userId, data) {
  return Category.create({ ...data, userId });
}

async function updateCategory(userId, categoryId, data) {
  const category = await Category.findOneAndUpdate({ _id: categoryId, userId }, data, { new: true });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

async function deleteCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (!category.isDeletable) {
    throw new ApiError(400, '"Other" is required as a fallback category and cannot be deleted');
  }

  const fallback = await Category.findOne({ userId, isDeletable: false });

  // Reassign this user's expenses off the deleted category before removing it —
  // never leave an expense pointing at a category that no longer exists.
  await Expense.updateMany({ userId, category: category._id }, { category: fallback._id });
  await category.deleteOne();
}

export { seedDefaultCategories, listCategories, createCategory, updateCategory, deleteCategory };
