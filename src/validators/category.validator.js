const { z } = require('zod');
const { ICON_KEYS, COLOR_HEXES } = require('../constants/categoryPresets');

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(30),
    icon: z.enum(ICON_KEYS),
    color: z.enum(COLOR_HEXES),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().trim().min(1).max(30).optional(),
    icon: z.enum(ICON_KEYS).optional(),
    color: z.enum(COLOR_HEXES).optional(),
  }),
});

module.exports = { createCategorySchema, updateCategorySchema };
