const { Schema, model } = require('mongoose');
const { ICON_KEYS, COLOR_HEXES } = require('../constants/categoryPresets');

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    icon: { type: String, required: true, enum: ICON_KEYS },
    color: { type: String, required: true, enum: COLOR_HEXES },
    // Only false for the seeded "Other" category — it's the reassignment
    // target when another category is deleted, so it must always exist.
    isDeletable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = model('Category', categorySchema);
