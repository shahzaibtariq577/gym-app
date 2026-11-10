const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    fee: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    features: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);