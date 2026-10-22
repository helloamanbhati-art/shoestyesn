const Joi = require('joi');

const objectId = Joi.string().hex().length(24);
const selectedComponent = Joi.object({
  componentId: Joi.string().trim().max(80).required(),
  size: Joi.string().trim().max(50).required(),
});

exports.addCartItemSchema = Joi.object({
  productId: objectId.required(),
  variantId: Joi.string().trim().max(100).allow(null, ''),
  selectedSize: Joi.string().trim().max(50).allow(null, ''),
  selectedComponents: Joi.array().items(selectedComponent).max(5).unique('componentId').default([]),
  selectedColor: Joi.string().trim().max(100).allow(null, ''),
  meters: Joi.number().valid(4, 5).allow(null),
  quantity: Joi.number().integer().min(1).max(100).default(1),
}).required();

exports.updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(100).required(),
}).required();

exports.cartItemParamsSchema = Joi.object({
  itemId: objectId.required(),
}).required();

exports.mergeCartSchema = Joi.object({
  items: Joi.array().items(exports.addCartItemSchema).max(50).required(),
}).required();

