const jwt = require("jsonwebtoken");
const { clerkClient, getAuth } = require("@clerk/express");
const Customer = require("../models/Customer");
const AdminUser = require("../models/AdminUser");
const {
  createSessionService,
  getRequestTokens,
} = require("../services/sessionService");
const {
  clearAdminCookies,
  createAdminSessionService,
  getAdminTokens,
} = require("../services/adminSessionService");
const { isConfiguredAdminEmail } = require("../services/configuredAdminService");

const customerSessionService = createSessionService();
const adminSessionService = createAdminSessionService();

async function resolveCustomer(req) {
  let clerkAuth = {};
  try {
    clerkAuth = getAuth(req);
  } catch (_error) {
    // Clerk is intentionally absent in isolated legacy unit tests.
  }
  if (clerkAuth.userId) {
    let customer = await Customer.findOne({ clerkId: clerkAuth.userId });
    if (!customer) {
      const clerkUser = await clerkClient.users.getUser(clerkAuth.userId);
      const primaryEmail = clerkUser.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress || null;
      const primaryPhone = clerkUser.phoneNumbers.find((item) => item.id === clerkUser.primaryPhoneNumberId)?.phoneNumber || null;
      customer = await Customer.findOneAndUpdate(
        { $or: [{ clerkId: clerkAuth.userId }, ...(primaryEmail ? [{ email: primaryEmail.toLowerCase() }] : []), ...(primaryPhone ? [{ phone: primaryPhone }] : [])] },
        {
          $set: { clerkId: clerkAuth.userId, isVerified: true, isActive: true, lastLogin: new Date() },
          $setOnInsert: { firstName: clerkUser.firstName || '', lastName: clerkUser.lastName || '', email: primaryEmail, phone: primaryPhone },
        },
        { new: true, upsert: true, runValidators: true },
      );
    }
    return customer?.isActive ? customer : null;
  }
  const { accessToken, usedAccessCookie } = getRequestTokens(req);
  if (!accessToken) return null;

  const decoded = jwt.decode(accessToken);
  let customerId;
  if (usedAccessCookie || decoded?.sid) {
    const claims = await customerSessionService.verifyCustomerAccessToken(accessToken);
    customerId = claims.sub;
  } else {
    const secret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
    const claims = jwt.verify(accessToken, secret);
    if (claims.role !== "customer") return null;
    customerId = claims.sub;
  }

  const customer = await Customer.findById(customerId);
  return customer?.isActive ? customer : null;
}

// Authenticate Customer
exports.authenticateCustomer = async (req, res, next) => {
  try {
    const customer = await resolveCustomer(req);
    if (!customer) throw new Error("Authentication required");

    req.customer = customer;
    return next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required" },
    });
  }
};

// Authenticate Admin
exports.authenticateAdmin = async (req, res, next) => {
  try {
    const { accessToken: token } = getAdminTokens(req);

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = await adminSessionService.verifyAccessToken(token);

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const admin = await AdminUser.findById(decoded.sub);
    if (!admin || !admin.isActive || !isConfiguredAdminEmail(admin.email)) {
      clearAdminCookies(res);
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    req.admin = admin;
    next();
  } catch (_error) {
    clearAdminCookies(res);
    return res
      .status(401)
      .json({ success: false, message: "Authentication is required" });
  }
};

// Authenticate Customer or Admin
exports.authenticateAny = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const secret = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
    const decoded = jwt.verify(token, secret);

    if (decoded.role === "admin") {
      const admin = await AdminUser.findById(decoded.sub);
      if (!admin || !admin.isActive) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      req.admin = admin;
      req.user = admin;
      req.userType = "admin";
    } else {
      const customer = await Customer.findById(decoded.sub);
      if (!customer || !customer.isActive) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      req.customer = customer;
      req.user = customer;
      req.userType = "customer";
    }

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid token", error: error.message });
  }
};

// Optional Authentication (doesn't fail if not authenticated)
exports.optionalAuthenticate = async (req, res, next) => {
  try {
    const customer = await resolveCustomer(req);
    if (customer) {
      req.customer = customer;
      req.user = customer;
      req.userType = "customer";
    }
    return next();
  } catch (_error) {
    return next();
  }
};

// Check Admin Role
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
};
