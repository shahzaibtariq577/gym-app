const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Electricity',
        'Rent',
        'Staff salary',
        'Equipment repair',
        'New equipment',
        'Internet',
        'Cleaning',
        'Other',
      ],
    },
    amount: { type: Number, required: true },
    note: { type: String, default: '', trim: true },
    billImage: { type: String, default: '' },
    hasBill: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);