const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    photo: { type: String, default: '' },
    packageName: { type: String, required: true },
    fee: { type: Number, required: true },
    joinDate: { type: Date, default: Date.now },
    nextDueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);