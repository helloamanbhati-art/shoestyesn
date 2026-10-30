const mongoose = require('mongoose');

const dailyVisitorSchema = new mongoose.Schema({
  dayKey: { type: String, required: true, index: true },
  visitorHash: { type: String, required: true },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true, index: true },
}, { timestamps: false });

dailyVisitorSchema.index({ dayKey: 1, visitorHash: 1 }, { unique: true });
dailyVisitorSchema.index({ dayKey: 1, lastSeenAt: -1 });

module.exports = mongoose.model('DailyVisitor', dailyVisitorSchema);
