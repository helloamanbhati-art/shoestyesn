const discountService = require('./discountService');
const taxService = require('./taxService');

class CheckoutError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'CheckoutError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getShippingCost(state) {
  // Temporary payment-test mode: remove delivery charges from every checkout.
  // Restore the state-based rate policy after the payment flow is verified.
  void state;
  return 0;
}

function productId(product) {
  return String(product?._id || product?.id || '');
}

function buildVariantSnapshot(product, cartItem) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const selected = variants.find((variant) => variant.variantId === cartItem.variantId);
  if (variants.length && !selected) {
    throw new CheckoutError('VARIANT_UNAVAILABLE', `${product.name} selection is no longer available`, 409);
  }
  const variant = selected || null;
  return {
    variantId: variant?.variantId || 'default',
    variantName: variant?.variantName || cartItem.selectedColor || 'Default',
    color: variant?.variantName || cartItem.selectedColor || null,
    pattern: product.name,
    sku: product.sku || null,
    thumbnail: variant?.images?.[0]?.imageUrl || product.image || null,
    primaryImage: variant?.images?.find((image) => image.isPrimary)?.imageUrl || variant?.images?.[0]?.imageUrl || product.image || null,
    galleryImages: variant?.images?.map((image) => image.imageUrl) || product.images || [],
    priceAtPurchase: Number(product.price || 0),
  };
}

function buildOrderItems(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new CheckoutError('EMPTY_CART', 'Your cart is empty');
  }

  return cartItems.map((cartItem) => {
    const product = cartItem.product;
    const quantity = Number(cartItem.quantity);
    if (!product || product.isActive === false || product.inStock === false) {
      throw new CheckoutError('PRODUCT_UNAVAILABLE', 'A product in your cart is no longer available', 409);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CheckoutError('INVALID_QUANTITY', 'Cart quantity is invalid');
    }
    if (product.trackInventory !== false && Number(product.stock?.available || 0) < quantity) {
      throw new CheckoutError('INSUFFICIENT_STOCK', `Only ${Math.max(Number(product.stock?.available || 0), 0)} of ${product.name} remain`, 409);
    }
    if (product.availableSizes?.length && !product.availableSizes.includes(cartItem.selectedSize)) {
      throw new CheckoutError('SIZE_UNAVAILABLE', `${product.name} size is no longer available`, 409);
    }
    const outfitComponents = Array.isArray(product.outfitComponents) ? product.outfitComponents : [];
    const selectedComponents = outfitComponents.map((component) => {
      const selected = (cartItem.selectedComponents || []).find((item) => item.componentId === component.componentId);
      if (!selected || !component.availableSizes?.includes(selected.size)) {
        throw new CheckoutError('COMPONENT_SIZE_UNAVAILABLE', `${product.name}: choose an available size for ${component.name}`, 409);
      }
      return { componentId: component.componentId, name: component.name, size: selected.size };
    });

    const meters = product.soldBy === 'meter' ? Number(cartItem.meters || 4) : 1;
    if (product.soldBy === 'meter' && ![4, 5].includes(meters)) {
      throw new CheckoutError('METER_OPTION_UNAVAILABLE', `${product.name} length is no longer available`, 409);
    }
    const price = product.soldBy === 'meter' && meters === 5
      ? Number(product.price || 0) + Number(product.compareAtPrice || 0)
      : Number(product.price || 0);
    const additionalChargeAmount = Number(product.additionalChargeAmount || 0);
    const subtotal = (price + additionalChargeAmount) * quantity;
    const selectedVariant = buildVariantSnapshot(product, cartItem);
    const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;

    return {
      product: product._id,
      productId: productId(product),
      productName: product.name,
      productImage: selectedVariant.primaryImage || selectedVariant.thumbnail || product.image,
      brand: brand || '',
      size: cartItem.selectedSize || null,
      selectedComponents,
      color: selectedVariant.color,
      selectedVariant,
      price,
      quantity,
      meters,
      soldBy: product.soldBy,
      subtotal,
      additionalChargeName: product.additionalChargeName || '',
      additionalChargeAmount,
      discount: 0,
      tax: 0,
      total: subtotal,
    };
  });
}

async function quoteCart(cartItems, shippingState, couponCode, customerId) {
  const items = buildOrderItems(cartItems);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  let discount = 0;
  if (couponCode) {
    const coupon = await discountService.validateCoupon(couponCode, subtotal, customerId);
    discount = discountService.calculateDiscount(coupon, subtotal);
  }
  const tax = await taxService.getOrderTax(items, shippingState);
  const shippingCost = getShippingCost(shippingState);
  return {
    items,
    subtotal,
    discount,
    tax,
    shippingCost,
    total: Math.max(0, subtotal - discount + tax + shippingCost),
  };
}

module.exports = {
  CheckoutError,
  buildOrderItems,
  getShippingCost,
  quoteCart,
};
