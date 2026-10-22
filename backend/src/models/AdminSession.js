const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
  familyId: { type: String, required: true, index: true },
  currentTokenHash: { type: String, required: true, unique: true },
  previousTokenHashes: [{ _id: false, hash: { type: String, required: true }, rotatedAt: { type: Date, required: true } }],
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  lastUsedAt: Date,
  revokedAt: { type: Date, default: null },
  revocationReason: String,
}, { timestamps: true });

module.exports = mongoose.model('AdminSession', adminSessionSchema);
