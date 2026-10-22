const DEFAULT_NEW_PRODUCT_STOCK = 100;

function resolveInitialStock(productData = {}) {
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
  resolveInitialStock,
};
