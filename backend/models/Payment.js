const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
    memberName: { type: String, required: true },
    packageName: { type: String, required: true },
    amount: { type: Number, required: true },
    paidOn: { type: Date, default: Date.now },
    oldDueDate: { type: Date },
    newDueDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);