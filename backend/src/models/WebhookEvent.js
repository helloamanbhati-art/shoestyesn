const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['razorpay'],
  },
  eventId: { type: String, required: true },
  eventType: { type: String, required: true },
  payloadHash: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'processed', 'failed'],
    default: 'processing',
  },
  processedAt: Date,
  lastError: String,
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
