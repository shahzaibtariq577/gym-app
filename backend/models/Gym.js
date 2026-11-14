const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gym', gymSchema);