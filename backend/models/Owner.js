const mongoose = require('mongoose');

// The gym owner who can log in. There is only one owner.
// The password is never saved: only a scrambled copy (a hash) is saved.
const ownerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Owner', ownerSchema);