const mongoose = require('mongoose');

// The settings of the gym and the owner's profile. There is only one of these.
const settingSchema = new mongoose.Schema(
  {
    gymName: { type: String, default: 'My Gym', trim: true },
    gymPhone: { type: String, default: '', trim: true },
    gymAddress: { type: String, default: '', trim: true },
    ownerName: { type: String, default: '', trim: true },
    ownerPhoto: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);