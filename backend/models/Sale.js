const mongoose = require('mongoose');

const METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank'];

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: METHODS, default: 'Cash' },
  slipImage: { type: String, default: '' },
  hasSlip: { type: Boolean, default: false },
  paidOn: { type: Date, default: Date.now },
});

const saleSchema = new mongoose.Schema(
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
    unitPrice: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    total: { type: Number, required: true },
    profit: { type: Number, default: 0 },
    soldOn: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: METHODS,
      default: 'Cash',
    },
    slipImage: { type: String, default: '' },
    hasSlip: { type: Boolean, default: false },
    amountPaid: { type: Number },
    payments: { type: [paymentSchema], default: [] },
    buyer: { type: String, default: '', trim: true },
    buyerPhone: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

saleSchema.index({ gymId: 1, soldOn: -1 });

module.exports = mongoose.model('Sale', saleSchema);