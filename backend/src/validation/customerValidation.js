const Joi = require("joi");

const customerName = (label) => Joi.string().trim().min(1).max(80).required().messages({
  "string.empty": `${label} is required`,
  "string.max": `${label} must be 80 characters or fewer`,
  "any.required": `${label} is required`,
});

exports.otpRequestSchema = Joi.object({
  firstName: customerName("First name"),
  lastName: customerName("Surname"),
  countryCode: Joi.string().trim().pattern(/^\+[1-9]\d{0,3}$/).required(),
  phone: Joi.string().trim().min(4).max(24).required(),
});

exports.otpVerifySchema = Joi.object({
  challengeId: Joi.string().trim().max(100).required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

// Customer Registration Schema
exports.customerRegisterSchema = Joi.object({
  firstName: Joi.string().trim().required().messages({
    "string.empty": "First name is required",
  }),
  lastName: Joi.string().trim().required().messages({
    "string.empty": "Last name is required",
  }),
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      "string.email": "Invalid email address",
    }),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone must be 10 digits",
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
  }),
});

// Customer Login Schema
exports.customerLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      "string.email": "Invalid email address",
    }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

// Update Customer Profile
exports.updateCustomerSchema = Joi.object({
  firstName: Joi.string().trim(),
  lastName: Joi.string().trim(),
  email: Joi.string().email().lowercase(),
  dateOfBirth: Joi.date(),
  gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say"),
  profileImage: Joi.string().uri(),
  preferences: Joi.object({
    newsletter: Joi.boolean(),
    smsNotifications: Joi.boolean(),
    emailNotifications: Joi.boolean(),
  }),
}).min(1);

// Add Address Schema
exports.addAddressSchema = Joi.object({
  type: Joi.string().valid("home", "work", "other").required(),
  fullName: Joi.string().trim().required(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{7,14}$/)
    .required(),
  addressLine1: Joi.string().trim().required(),
  addressLine2: Joi.string().trim().allow(""),
  houseName: Joi.string().trim().allow(""),
  building: Joi.string().trim().allow(""),
  street: Joi.string().trim().allow(""),
  landmark: Joi.string().trim().allow(""),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  zipCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required(),
  country: Joi.string().trim().required(),
  isDefault: Joi.boolean(),
});

exports.updateAddressSchema = exports.addAddressSchema.fork(
  ["type", "fullName", "phone", "addressLine1", "city", "state", "zipCode", "country"],
  (schema) => schema.optional()
).min(1);

exports.addressParamsSchema = Joi.object({
  addressId: Joi.string().hex().length(24).required(),
});

// Password Reset Schema
exports.passwordResetSchema = Joi.object({
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
  }),
});

// Verify Email Schema
exports.verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});
