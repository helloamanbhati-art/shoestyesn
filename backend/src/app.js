require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { clerkMiddleware } = require("@clerk/express");


// Middleware
const { requestLogger } = require("./middleware/logger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");
const { getAllowedOrigins, requireTrustedOrigin } = require("./middleware/csrf");

// Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const shareController = require('./controllers/shareController');

// Models - Import from separate files
const AdminUser = require("./models/AdminUser");
const AdminSession = require("./models/AdminSession");
const { synchronizeConfiguredAdmin } = require('./services/configuredAdminService');

const app = express();

app.use(helmet());

// Render terminates HTTPS at one trusted proxy. This lets rate limiting use the
// real client IP instead of grouping every shopper under the proxy address.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Credentialed browser requests are accepted only from configured storefront/admin origins.
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));

// Middleware for parsing request bodies
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buffer) => {
    if (req.originalUrl === "/api/v1/payments/webhook/razorpay") {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  app.use(clerkMiddleware());
}
app.use(requireTrustedOrigin);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Server-rendered metadata for messaging and social-media link previews.
app.get('/share/product/:id', shareController.getProductSharePage);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/cart", cartRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

/**
 * Ensure default admin user exists
 * Creates one if it doesn't exist using environment variables
 */
async function ensureDefaultAdmin() {
  try {
    await synchronizeConfiguredAdmin({ AdminUser, AdminSession });
    console.log("Admin account configuration synchronized");
  } catch (error) {
    console.error("Error ensuring default admin:", error.message);
    throw error;
  }
}

module.exports = { app, ensureDefaultAdmin };
