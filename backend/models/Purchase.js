const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    total: { type: Number, required: true },
    supplier: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
    billImage: { type: String, default: '' },
    hasBill: { type: Boolean, default: false },
    boughtOn: { type: Date, default: Date.now },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    previousCostPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

purchaseSchema.index({ gymId: 1, boughtOn: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);