const mongoose = require('mongoose');

const selectedComponentSchema = new mongoose.Schema({
  componentId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  size: { type: String, required: true, trim: true },
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variantId: {
    type: String,
    required: true,
    trim: true,
    default: 'default',
  },
  selectedSize: { type: String, default: null, trim: true },
  selectedComponents: { type: [selectedComponentSchema], default: [] },
  selectedColor: { type: String, default: null, trim: true },
  meters: { type: Number, default: null, min: 1 },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number',
    },
  },
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true,
    index: true,
  },
  items: { type: [cartItemSchema], default: [] },
}, {
  timestamps: true,
  optimisticConcurrency: true,
});

module.exports = mongoose.model('Cart', cartSchema);
