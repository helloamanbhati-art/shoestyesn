const mongoose = require("mongoose");

const productOptionsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    sizes: {
      type: [String],
      default: ["36", "37", "38", "39", "40", "41"],
    },
    clothingTypes: {
      type: [String],
      default: [
        "Sneakers",
        "Flats",
        "Sandals",
        "Heels",
        "Wedges",
        "Loafers",
        "Mules",
        "Slippers",
        "Ankle Boots",
        "Knee Boots",
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductOptions", productOptionsSchema);
