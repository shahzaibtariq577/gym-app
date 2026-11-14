const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      unique: true,
    },
    gymName: { type: String, default: 'My Gym', trim: true },
    gymPhone: { type: String, default: '', trim: true },
    gymAddress: { type: String, default: '', trim: true },
    ownerName: { type: String, default: '', trim: true },
    ownerPhoto: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);