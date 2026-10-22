const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ProductOptions = require('../models/ProductOptions');
const {
  CartValidationError,
  MAX_CART_ITEMS,
  buildCartSelection,
  cartSelectionsMatch,
  mergeCartSelections,
  serializeCart,
} = require('../services/cartService');

const productPopulation = {
  path: 'items.product',
  populate: [
    { path: 'brand', select: 'name slug' },
    { path: 'category', select: 'name slug' },
  ],
};

async function getFallbackSizes(product) {
  if (product.soldBy !== 'piece' || product.availableSizes?.length || product.outfitComponents?.length) return [];
  const options = await ProductOptions.findOne({ key: 'default' }).lean();
  return options?.sizes || [];
}

async function findOrCreateCart(customerId) {
  const existing = await Cart.findOne({ customer: customerId });
  if (existing) return existing;

  try {
    return await Cart.create({ customer: customerId, items: [] });
  } catch (error) {
    if (error?.code === 11000) {
      return Cart.findOne({ customer: customerId });
    }
    throw error;
  }
}

async function sendCart(res, cart, statusCode = 200, extra = {}) {
  if (!cart) {
    return res.status(statusCode).json({
      success: true,
      data: { ...serializeCart({ items: [] }), ...extra },
    });
  }

  const populated = await Cart.findById(cart._id).populate(productPopulation);
  return res.status(statusCode).json({
    success: true,
    data: { ...serializeCart(populated), ...extra },
  });
}

function handleCartError(error, res, next) {
  if (error instanceof CartValidationError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  if (error instanceof mongoose.Error.VersionError) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CART_CHANGED',
        message: 'Your cart changed in another session. Refresh and try again.',
      },
    });
  }
  return next(error);
}

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customer: req.customer._id });
    return sendCart(res, cart);
  } catch (error) {
    return next(error);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    const input = req.validatedData || req.body;
    const product = await Product.findById(input.productId);
    if (!product) {
      throw new CartValidationError('PRODUCT_NOT_FOUND', 'Product was not found', 404);
    }

    const fallbackSizes = await getFallbackSizes(product);
    const cart = await findOrCreateCart(req.customer._id);
    const proposed = buildCartSelection(product, input, fallbackSizes);
    const existing = cart.items.find((item) => cartSelectionsMatch(item, proposed));

    if (existing) {
      const combined = buildCartSelection(product, {
        ...proposed,
        quantity: existing.quantity + proposed.quantity,
      }, fallbackSizes);
      existing.quantity = combined.quantity;
    } else {
      if (cart.items.length >= MAX_CART_ITEMS) {
        throw new CartValidationError(
          'CART_ITEM_LIMIT',
          `A cart can contain up to ${MAX_CART_ITEMS} different items`,
          409,
        );
      }
      cart.items.push(proposed);
    }

    await cart.save();
    return sendCart(res, cart, 201);
  } catch (error) {
    return handleCartError(error, res, next);
  }
};

exports.mergeCart = async (req, res, next) => {
  try {
    const input = req.validatedData || req.body;
    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const cart = await findOrCreateCart(req.customer._id);
    const normalized = [];
    const stockByProduct = new Map();
    const adjustments = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        adjustments.push({
          productId: item.productId,
          requestedQuantity: item.quantity,
          appliedQuantity: 0,
          reason: 'PRODUCT_UNAVAILABLE',
        });
        continue;
      }

      const maximum = product.trackInventory === false
        ? Number.POSITIVE_INFINITY
        : Number(product.stock?.available || 0);
      if (maximum < 1 || product.isActive === false) {
        adjustments.push({
          productId: item.productId,
          requestedQuantity: item.quantity,
          appliedQuantity: 0,
          reason: 'PRODUCT_UNAVAILABLE',
        });
        continue;
      }
      const appliedInputQuantity = Math.min(item.quantity, maximum);
      const fallbackSizes = await getFallbackSizes(product);
      normalized.push(buildCartSelection(product, {
        ...item,
        quantity: appliedInputQuantity,
      }, fallbackSizes));
      stockByProduct.set(item.productId, maximum);
      if (appliedInputQuantity < item.quantity) {
        adjustments.push({
          productId: item.productId,
          requestedQuantity: item.quantity,
          appliedQuantity: appliedInputQuantity,
          reason: 'STOCK_CAPPED',
        });
      }
    }

    const currentItems = cart.items.map((item) => item.toObject());
    const merged = mergeCartSelections(currentItems, normalized, stockByProduct);
    cart.items = merged.items;
    await cart.save();
    return sendCart(res, cart, 200, {
      adjustments: [...adjustments, ...merged.adjustments],
    });
  } catch (error) {
    return handleCartError(error, res, next);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const input = req.validatedData || req.body;
    const cart = await Cart.findOne({ customer: req.customer._id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) {
      throw new CartValidationError('CART_ITEM_NOT_FOUND', 'Cart item was not found', 404);
    }

    const product = await Product.findById(item.product);
    if (!product) {
      throw new CartValidationError('PRODUCT_NOT_FOUND', 'Product was not found', 404);
    }
    const fallbackSizes = await getFallbackSizes(product);
    const updated = buildCartSelection(product, {
      variantId: item.variantId,
      selectedSize: item.selectedSize,
      selectedComponents: item.selectedComponents || [],
      selectedColor: item.selectedColor,
      meters: item.meters,
      quantity: input.quantity,
    }, fallbackSizes);

    item.quantity = updated.quantity;
    await cart.save();
    return sendCart(res, cart);
  } catch (error) {
    return handleCartError(error, res, next);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customer: req.customer._id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) {
      throw new CartValidationError('CART_ITEM_NOT_FOUND', 'Cart item was not found', 404);
    }

    item.deleteOne();
    await cart.save();
    return sendCart(res, cart);
  } catch (error) {
    return handleCartError(error, res, next);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const cart = await findOrCreateCart(req.customer._id);
    cart.items = [];
    await cart.save();
    return sendCart(res, cart);
  } catch (error) {
    return handleCartError(error, res, next);
  }
};

