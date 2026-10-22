export function buildProductShareUrl(productId, variantId, storefrontUrl) {
  const baseUrl = storefrontUrl.replace(/\/+$/, '');
  const path = `${baseUrl}/share/product/${encodeURIComponent(productId)}`;

  if (!variantId) return path;

  const query = new URLSearchParams({ variant: variantId });
  return `${path}?${query}`;
}
