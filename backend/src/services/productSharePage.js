const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const cleanDescription = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 200);

const isVideoUrl = (value) => /\.(mp4|webm|ogg|mov|m4v)(?:[?#]|$)/i.test(String(value || ''));

const firstShareableImage = (images = []) => images
  .map((image) => typeof image === 'string' ? image : image?.imageUrl)
  .find((imageUrl) => imageUrl && !isVideoUrl(imageUrl));

function buildProductSharePage({ product, variantId, storefrontUrl }) {
  const baseUrl = storefrontUrl.replace(/\/+$/, '');
  const productId = String(product._id || product.id);
  const selectedVariant = variantId
    ? product.variants?.find((variant) => variant.variantId === variantId)
    : null;
  const variantImageUrl = firstShareableImage([
    selectedVariant?.images?.find((image) => image.isPrimary),
    ...(selectedVariant?.images || []),
  ]);
  const imageUrl = variantImageUrl
    || firstShareableImage([product.image, ...(product.images || [])])
    || `${baseUrl}/shoe-style-logo.png`;
  const query = variantId ? `?${new URLSearchParams({ variant: variantId })}` : '';
  const productUrl = `${baseUrl}/product/${encodeURIComponent(productId)}${query}`;
  const shareUrl = `${baseUrl}/share/product/${encodeURIComponent(productId)}${query}`;
  const title = `${product.name} | Shoe Fashion`;
  const details = cleanDescription(product.shortDescription || product.description);
  const description = details || `Shop ${product.name} for ₹${Number(product.price || 0).toLocaleString('en-IN')}.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Shoe Fashion">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">
  <meta property="product:price:amount" content="${escapeHtml(product.price)}">
  <meta property="product:price:currency" content="INR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
  <link rel="canonical" href="${escapeHtml(productUrl)}">
</head>
<body>
  <p>Opening <a href="${escapeHtml(productUrl)}">${escapeHtml(product.name)}</a>…</p>
</body>
</html>`;
}

module.exports = { buildProductSharePage, escapeHtml };
