const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gym',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    salePrice: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    photo: { type: String, default: '' },
  },
  { timestamps: true }
);

productSchema.index({ gymId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);