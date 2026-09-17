/**
 * Single source of truth for the curated icon/color sets a category can use,
 * and the default categories seeded for every new user. Mirrored in
 * frontend/docs/DESIGN_SYSTEM.md — keep both in sync if this changes.
 *
 * Curated (not free-form) so every user's category list stays visually
 * consistent instead of accumulating clashing custom colors/icons.
 */

const ICON_KEYS = [
  'restaurant',
  'directions_car',
  'shopping_bag',
  'receipt_long',
  'movie',
  'favorite',
  'category',
  'home',
  'flight',
  'school',
  'fitness_center',
  'pets',
  'local_grocery_store',
  'sports_esports',
  'local_hospital',
  'coffee',
];

const COLOR_HEXES = [
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EF4444', // red-orange
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6B7280', // gray
  '#22C55E', // green
  '#6366F1', // indigo
  '#92400E', // brown
];

/** Seeded for every new user at signup. `Other` is the only non-deletable one. */
const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'restaurant', color: '#F59E0B', isDeletable: true },
  { name: 'Transport', icon: 'directions_car', color: '#3B82F6', isDeletable: true },
  { name: 'Shopping', icon: 'shopping_bag', color: '#8B5CF6', isDeletable: true },
  { name: 'Bills', icon: 'receipt_long', color: '#EF4444', isDeletable: true },
  { name: 'Entertainment', icon: 'movie', color: '#EC4899', isDeletable: true },
  { name: 'Health', icon: 'favorite', color: '#14B8A6', isDeletable: true },
  { name: 'Other', icon: 'category', color: '#6B7280', isDeletable: false },
];

export { ICON_KEYS, COLOR_HEXES, DEFAULT_CATEGORIES };
