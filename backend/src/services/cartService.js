const { isProductSaleable } = require('./productStockService');

const MAX_CART_ITEMS = 50;

class CartValidationError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'CartValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeId(value) {
  if (value && typeof value === 'object' && value._id) {
    return String(value._id);
  }
  return String(value ?? '');
}

function buildCartSelection(product, input, fallbackSizes = []) {
  if (!product || product.isActive === false) {
    throw new CartValidationError('PRODUCT_UNAVAILABLE', 'Product is not available');
  }

  const quantity = Number(input.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartValidationError('INVALID_QUANTITY', 'Quantity must be a positive whole number');
  }

  const availableStock = product.trackInventory === false
    ? Number.POSITIVE_INFINITY
    : Number(product.stock?.available ?? 0);
  if (quantity > availableStock) {
    throw new CartValidationError(
      'INSUFFICIENT_STOCK',
      `Only ${Math.max(availableStock, 0)} available`,
      409,
    );
  }

  const availableSizes = product.availableSizes?.length
    ? product.availableSizes
    : product.soldBy === 'piece'
      ? fallbackSizes
      : [];
  const selectedSize = input.selectedSize ? String(input.selectedSize).trim() : null;

  if (availableSizes.length > 0 && !selectedSize) {
    throw new CartValidationError('SIZE_REQUIRED', 'A size is required for this product');
  }
  if (selectedSize && availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
    throw new CartValidationError('SIZE_UNAVAILABLE', 'Selected size is not available');
  }

  const outfitComponents = Array.isArray(product.outfitComponents) ? product.outfitComponents : [];
  const requestedComponents = Array.isArray(input.selectedComponents) ? input.selectedComponents : [];
  const selectedComponents = outfitComponents.map((component) => {
    const selected = requestedComponents.find((item) => item.componentId === component.componentId);
    if (!selected?.size) {
      throw new CartValidationError('COMPONENT_SIZE_REQUIRED', `Select a size for ${component.name}`);
    }
    const size = String(selected.size).trim();
    if (!component.availableSizes?.includes(size)) {
      throw new CartValidationError('COMPONENT_SIZE_UNAVAILABLE', `${component.name} size is not available`);
    }
    return { componentId: component.componentId, name: component.name, size };
  });

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const requestedVariantId = input.variantId ? String(input.variantId) : null;
  let selectedVariant = null;

  if (variants.length > 0) {
    selectedVariant = requestedVariantId
      ? variants.find((variant) => variant.variantId === requestedVariantId)
      : variants[0];
    if (!selectedVariant) {
      throw new CartValidationError('VARIANT_UNAVAILABLE', 'Selected variant is not available');
    }
  } else if (requestedVariantId && requestedVariantId !== 'default') {
    throw new CartValidationError('VARIANT_UNAVAILABLE', 'Selected variant is not available');
  }

  let meters = null;
  if (product.soldBy === 'meter') {
    meters = Number(input.meters || 4);
    if (![4, 5].includes(meters)) {
      throw new CartValidationError(
        'METER_OPTION_UNAVAILABLE',
        'Selected meter option is not available',
      );
    }
  }

  return {
    product: normalizeId(product),
    variantId: selectedVariant?.variantId || requestedVariantId || 'default',
    selectedSize,
    ...(selectedComponents.length ? { selectedComponents } : {}),
    selectedColor: selectedVariant?.variantName || input.selectedColor || null,
    meters,
    quantity,
  };
}

function cartSelectionsMatch(left, right) {
  return normalizeId(left.product) === normalizeId(right.product)
    && (left.variantId || 'default') === (right.variantId || 'default')
    && (left.selectedSize || null) === (right.selectedSize || null)
    && JSON.stringify(left.selectedComponents || []) === JSON.stringify(right.selectedComponents || [])
    && (left.selectedColor || null) === (right.selectedColor || null)
    && (left.meters || null) === (right.meters || null);
}

function getCurrentUnitPrice(item) {
  const product = item.product;
  if (!product) return 0;

  const basePrice = product.soldBy === 'meter' && Number(item.meters) === 5
    ? Number(product.price || 0) + Number(product.compareAtPrice || 0)
    : Number(product.price || 0);

  return basePrice + Number(product.additionalChargeAmount || 0);
}

function summarizeCartItems(items) {
  return items.reduce((summary, item) => {
    const quantity = Number(item.quantity || 0);
    summary.totalItems += quantity;
    summary.subtotal += getCurrentUnitPrice(item) * quantity;
    return summary;
  }, { totalItems: 0, subtotal: 0 });
}

function serializeProduct(product) {
  const source = typeof product?.toObject === 'function' ? product.toObject() : product;
  if (!source) return null;

  return {
    id: normalizeId(source),
    name: source.name,
    slug: source.slug,
    description: source.description,
    shortDescription: source.shortDescription,
    price: Number(source.price || 0),
    compareAtPrice: Number(source.compareAtPrice || 0),
    additionalChargeName: source.additionalChargeName || '',
    additionalChargeAmount: Number(source.additionalChargeAmount || 0),
    image: source.image || null,
    images: source.images || [],
    colors: source.colors || [],
    variants: source.variants || [],
    brand: source.brand || null,
    category: source.category || null,
    soldBy: source.soldBy,
    sku: source.sku || null,
    availableSizes: source.availableSizes || [],
    outfitComponents: source.outfitComponents || [],
    stock: source.stock || { available: 0 },
    trackInventory: source.trackInventory !== false,
    inStock: source.inStock !== false,
    isActive: source.isActive !== false,
  };
}

function serializeCart(cart) {
  const items = (cart?.items || []).map((item) => {
    const product = serializeProduct(item.product);
    const isAvailable = Boolean(
      product
      && isProductSaleable(product)
      && (!product.trackInventory || product.stock.available >= item.quantity),
    );
    const unitPrice = product ? getCurrentUnitPrice({ ...item, product }) : 0;

    return {
      id: normalizeId(item),
      product,
      variantId: item.variantId || 'default',
      selectedSize: item.selectedSize || null,
      selectedComponents: item.selectedComponents || [],
      selectedColor: item.selectedColor || null,
      meters: item.meters || null,
      quantity: Number(item.quantity || 0),
      unitPrice,
      lineTotal: unitPrice * Number(item.quantity || 0),
      isAvailable,
    };
  });
  const availableItems = items.filter((item) => item.isAvailable);
  const payableSummary = summarizeCartItems(availableItems);

  return {
    id: cart?._id ? normalizeId(cart) : null,
    items,
    summary: {
      totalItems: items.reduce((total, item) => total + item.quantity, 0),
      payableItems: payableSummary.totalItems,
      subtotal: payableSummary.subtotal,
    },
    updatedAt: cart?.updatedAt || null,
  };
}

function mergeCartSelections(existingItems, incomingItems, stockByProduct) {
  const items = existingItems.map((item) => ({ ...item }));
  const adjustments = [];

  for (const incoming of incomingItems) {
    const productId = normalizeId(incoming.product);
    const existing = items.find((item) => cartSelectionsMatch(item, incoming));
    const requestedQuantity = Number(incoming.quantity || 0) + Number(existing?.quantity || 0);
    const maximum = stockByProduct.get(productId) ?? 0;
    const appliedQuantity = Number.isFinite(maximum)
      ? Math.min(requestedQuantity, maximum)
      : requestedQuantity;

    if (existing) {
      existing.quantity = appliedQuantity;
    } else {
      if (items.length >= MAX_CART_ITEMS) {
        throw new CartValidationError(
          'CART_ITEM_LIMIT',
          `A cart can contain up to ${MAX_CART_ITEMS} different items`,
          409,
        );
      }
      items.push({ ...incoming, quantity: appliedQuantity });
    }

    if (appliedQuantity < requestedQuantity) {
      adjustments.push({
        productId,
        requestedQuantity,
        appliedQuantity,
        reason: 'STOCK_CAPPED',
      });
    }
  }

  return { items, adjustments };
}

module.exports = {
  MAX_CART_ITEMS,
  CartValidationError,
  buildCartSelection,
  cartSelectionsMatch,
  getCurrentUnitPrice,
  mergeCartSelections,
  serializeCart,
  summarizeCartItems,
};
