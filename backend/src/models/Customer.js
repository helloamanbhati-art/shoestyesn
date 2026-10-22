const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Basic Info
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^\+[1-9]\d{7,14}$/, "Phone must use E.164 format"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },

    // Profile
    profileImage: String,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    dateOfBirth: Date,

    // Addresses
    addresses: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        houseName: String,
        building: String,
        street: String,
        landmark: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Preferences
    preferences: {
      newsletter: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      preferredCurrency: { type: String, default: "INR" },
    },

    // Account Stats
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderDate: Date,
    loyaltyPoints: { type: Number, default: 0 },

    // Wishlist
    wishlist: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Account Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpiry: Date,
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,

    // Metadata
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true }
);

// Hash password before saving
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare passwords
customerSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Get full name
customerSchema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ");
});

// Index for faster queries
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Customer", customerSchema);
