const DEFAULT_NEW_PRODUCT_STOCK = 100;

function normalizeSizeStock(sizeStock = []) {
  if (!Array.isArray(sizeStock)) return [];
  const seen = new Set();
  return sizeStock.flatMap((entry) => {
    const size = String(entry?.size || '').trim();
    if (!size || seen.has(size)) return [];
    seen.add(size);
    return [{
      size,
      available: Math.max(0, Math.floor(Number(entry?.available) || 0)),
      reserved: Math.max(0, Math.floor(Number(entry?.reserved) || 0)),
    }];
  });
}

function resolveInitialStock(productData = {}) {
  const normalizedSizes = normalizeSizeStock(productData.sizeStock);
  if (normalizedSizes.length > 0) {
    const available = normalizedSizes.reduce((sum, entry) => sum + entry.available, 0);
    return { available, inStock: available > 0 };
  }
  const hasExplicitQuantity = productData.stock?.available !== undefined
    && productData.stock?.available !== null;
  const available = hasExplicitQuantity
    ? Math.max(0, Number(productData.stock.available) || 0)
    : productData.inStock === false
      ? 0
      : DEFAULT_NEW_PRODUCT_STOCK;

  return {
    available,
    inStock: available > 0,
  };
}

function isProductSaleable(product = {}) {
  if (product.isActive === false) return false;
  if (product.trackInventory === false) return true;
  return Number(product.stock?.available || 0) > 0;
}

module.exports = {
  DEFAULT_NEW_PRODUCT_STOCK,
  isProductSaleable,
  normalizeSizeStock,
  resolveInitialStock,
};
