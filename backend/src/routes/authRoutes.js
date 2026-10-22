const express = require("express");
const authController = require("../controllers/authController");
const { authenticateCustomer } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate, validateParams } = require("../middleware/validation");
const {
  addAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
  updateCustomerSchema,
} = require("../validation/customerValidation");

const router = express.Router();

// Public routes
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/me", authenticateCustomer, authController.getCurrentCustomer);
router.get("/profile", authenticateCustomer, authController.getProfile);
router.get("/addresses", authenticateCustomer, authController.getAddresses);
router.put("/profile", authenticateCustomer, validate(updateCustomerSchema), authController.updateProfile);

// Addresses
router.post("/addresses", authenticateCustomer, validate(addAddressSchema), authController.addAddress);
router.put("/addresses/:addressId", authenticateCustomer, validateParams(addressParamsSchema), validate(updateAddressSchema), authController.updateAddress);
router.delete("/addresses/:addressId", authenticateCustomer, validateParams(addressParamsSchema), authController.deleteAddress);

// Wishlist
router.post("/wishlist", authenticateCustomer, authController.addToWishlist);
router.delete("/wishlist/:productId", authenticateCustomer, authController.removeFromWishlist);
router.get("/wishlist", authenticateCustomer, authController.getWishlist);

module.exports = router;
