const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["customer"], default: "customer" },
    familyId: { type: String, required: true, index: true },
    currentTokenHash: { type: String, required: true, unique: true, select: false },
    previousTokenHashes: [
      {
        _id: false,
        hash: { type: String, required: true, select: false },
        rotatedAt: { type: Date, required: true },
      },
    ],
    expiresAt: { type: Date, required: true },
    lastUsedAt: Date,
    revokedAt: Date,
    revocationReason: {
      type: String,
      enum: ["logout", "refresh_token_reuse", "expired", "administrative"],
    },
  },
  { timestamps: true }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ "previousTokenHashes.hash": 1 });

module.exports = mongoose.model("AuthSession", authSessionSchema);
