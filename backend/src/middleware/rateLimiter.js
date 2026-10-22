const rateLimit = require("express-rate-limit");

function structuredLimiter({ windowMs, max, code, message, ...options }) {
  return rateLimit({
    windowMs,
    max,
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: {
        code,
        message,
        details: { retryAfter: Math.ceil(windowMs / 1000) },
      },
    }),
  });
}

// General rate limiter
exports.generalLimiter = structuredLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  code: "API_RATE_LIMITED",
  message: "Too many requests. Please try again later.",
});

// Strict rate limiter for auth endpoints
exports.authLimiter = structuredLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  code: "AUTH_RATE_LIMITED",
  message: "Too many login attempts. Please try again after 15 minutes.",
  skipSuccessfulRequests: true, // don't count successful requests
});

// Session restoration happens automatically when the storefront loads. Keep it
// isolated from interactive login/OTP attempts so it cannot lock customers out.
exports.sessionLimiter = structuredLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  code: "SESSION_RATE_LIMITED",
  message: "Too many session requests. Please wait a moment and try again.",
  skipSuccessfulRequests: true,
});

// API routes limiter
exports.apiLimiter = structuredLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute (increased for admin panel)
  code: "API_RATE_LIMITED",
  message: "Too many API requests. Please try again later.",
});

// Upload limiter
exports.uploadLimiter = structuredLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 uploads per hour
  code: "UPLOAD_RATE_LIMITED",
  message: "Too many uploads. Please try again later.",
});
