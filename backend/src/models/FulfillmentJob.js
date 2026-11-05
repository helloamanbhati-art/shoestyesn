const mongoose = require('mongoose');

const fulfillmentJobSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  type: { type: String, enum: ['create_shiprocket_order'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0, min: 0 },
  availableAt: { type: Date, default: Date.now },
  lockedUntil: Date,
  lastErrorCode: String,
  completedAt: Date,
}, { timestamps: true });

fulfillmentJobSchema.index({ order: 1, type: 1 }, { unique: true });
fulfillmentJobSchema.index({ status: 1, availableAt: 1, lockedUntil: 1 });

module.exports = mongoose.model('FulfillmentJob', fulfillmentJobSchema);
