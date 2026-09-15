const { Schema, model } = require('mongoose');

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    // The date the expense happened — distinct from createdAt/updatedAt,
    // which are just the audit trail. Analytics/export filter on this.
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

// Every real query filters by userId + a date range, then sorts by date desc.
expenseSchema.index({ userId: 1, date: -1 });

module.exports = model('Expense', expenseSchema);
