const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

const cartItemSchema = Joi.object({
  productId: objectId.required(),
  variantId: Joi.string().trim().max(100).allow(null, ''),
  selectedSize: Joi.string().trim().max(50).allow(null, ''),
  selectedComponents: Joi.array().max(20).items(Joi.object({
    componentId: Joi.string().trim().max(100).required(),
    size: Joi.string().trim().max(50).required(),
  })).default([]),
  selectedColor: Joi.string().trim().max(100).allow(null, ''),
  meters: Joi.number().valid(4, 5).allow(null),
  quantity: Joi.number().integer().min(1).max(10).required(),
});

const cartItemsSchema = Joi.array().min(1).max(50).items(cartItemSchema);
const buyNowItemsSchema = Joi.array().length(1).items(cartItemSchema);

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{7,14}$/)
    .required(),
  houseName: Joi.string().trim(),
  building: Joi.string().trim(),
  street: Joi.string().trim(),
  landmark: Joi.string().trim().allow(''),
  addressLine1: Joi.string().trim().required(),
  addressLine2: Joi.string().trim().allow(''),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  zipCode: Joi.string().pattern(/^[0-9]{6}$/),
  pincode: Joi.string().pattern(/^[0-9]{6}$/),
  zip: Joi.string().pattern(/^[0-9]{6}$/),
  country: Joi.string().trim().default('India'),
}).custom((value, helpers) => {
  if (value.zipCode || value.pincode || value.zip) {
    return value;
  }
  return helpers.message('zipCode, pincode, or zip is required');
}, 'zip code normalization');

// Prices are never accepted from the browser. Signed-in carts come from the
// database; guest selections contain identifiers and quantities only.
exports.createOrderSchema = Joi.object({
  addressId: objectId,
  checkoutMode: Joi.string().valid('buyNow'),
  guest: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    shippingAddress: addressSchema.required(),
  }),
  items: Joi.when('checkoutMode', {
    is: 'buyNow',
    then: buyNowItemsSchema.required(),
    otherwise: Joi.when('addressId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: cartItemsSchema,
    }),
  }),
  paymentMethod: Joi.string()
    .valid("razorpay", "upi", "card", "netbanking", "wallet")
    .default("razorpay"),
  shippingMethod: Joi.string()
    .valid("standard", "express", "overnight")
    .default("standard"),
  couponCode: Joi.string().trim().max(50).allow(""),
  customerNotes: Joi.string().trim().max(1000).allow(""),
}).xor('addressId', 'guest').with('guest', 'items').required();

exports.checkoutQuoteSchema = Joi.object({
  addressId: objectId,
  shippingAddress: addressSchema,
  checkoutMode: Joi.string().valid('buyNow'),
  items: Joi.when('checkoutMode', {
    is: 'buyNow',
    then: buyNowItemsSchema.required(),
    otherwise: Joi.when('addressId', {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: cartItemsSchema.required(),
    }),
  }),
  couponCode: Joi.string().trim().max(50).allow(""),
}).xor("addressId", "shippingAddress").required();

exports.addressSchema = addressSchema;
exports.cartItemSchema = cartItemSchema;

// Update Order Status Schema
exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "refunded"
    )
    .required(),
  notes: Joi.string(),
  trackingNumber: Joi.string(),
  carrier: Joi.string(),
}).required();

// Refund Schema
exports.refundSchema = Joi.object({
  refundMethod: Joi.string()
    .valid("original_payment", "store_credit")
    .required(),
  refundReason: Joi.string().required(),
  refundAmount: Joi.number().positive().required(),
  notes: Joi.string(),
}).required();
