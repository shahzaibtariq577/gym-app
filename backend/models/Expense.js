const mongoose = require('mongoose');

// One expense of the gym: electricity, rent, salary, repair...
// billImage is an optional picture of the bill (saved as text, like the bank slip).
// hasBill tells the screen that a picture exists, without sending the big picture.
const expenseSchema = new mongoose.Schema(
  {
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