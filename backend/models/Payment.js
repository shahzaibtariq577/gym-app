const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    memberName: { type: String, required: true },
    packageName: { type: String, required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['Cash', 'JazzCash', 'Easypaisa', 'Bank'],
      default: 'Cash',
    },
    feeAtPayment: { type: Number },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    slipImage: { type: String, default: '' },
    hasSlip: { type: Boolean, default: false },
    paidOn: { type: Date, default: Date.now },
    oldDueDate: { type: Date },
    newDueDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);