const express = require("express");
const orderController = require("../controllers/orderController");
const { authenticateCustomer, optionalAuthenticate } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validation");
const { checkoutQuoteSchema, createOrderSchema } = require("../validation/orderValidation");

const router = express.Router();

// Signed-in orders use the customer's database cart; guests submit selections
// that are revalidated and repriced from the product database.
router.post("/quote", optionalAuthenticate, apiLimiter, validate(checkoutQuoteSchema), orderController.quoteOrder);
router.post("/", optionalAuthenticate, apiLimiter, validate(createOrderSchema), orderController.createOrder);

// Get customer orders
router.get("/", authenticateCustomer, orderController.getCustomerOrders);

// Get order by ID
router.get("/returns", authenticateCustomer, orderController.getReturns);
router.get("/track/:orderNumber", orderController.trackOrder);
router.get("/:orderId", optionalAuthenticate, orderController.getOrderById);

// Request return
router.post("/:orderId/return", authenticateCustomer, orderController.requestReturn);

module.exports = router;
