const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
    },
    name: { type: String, required: true },
    fee: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    features: { type: [String], default: [] },
  },
  { timestamps: true }
);

packageSchema.index({ gymId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Package', packageSchema);