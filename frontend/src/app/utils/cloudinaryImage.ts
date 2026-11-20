const CLOUDINARY_IMAGE_UPLOAD_PATH = '/image/upload/';
const DELIVERY_WIDTHS = [160, 480, 960, 1280] as const;

/**
 * Deliver uploaded Cloudinary images at a small set of shared display widths.
 * Shared widths keep each asset's derived-variant count predictable while
 * avoiding original-size downloads in product grids and detail galleries.
 */
export function getCloudinaryImageUrl(source: string, requestedWidth: number): string {
  if (!source || !source.includes('res.cloudinary.com')) return source;

  const uploadIndex = source.indexOf(CLOUDINARY_IMAGE_UPLOAD_PATH);
  if (uploadIndex === -1) return source;

  const assetPath = source.slice(uploadIndex + CLOUDINARY_IMAGE_UPLOAD_PATH.length);
  const firstSegment = assetPath.split('/')[0];
  // Keep custom transformations as-is instead of stacking another transformation.
  if (/^(?:a_|b_|c_|dpr_|e_|f_|fl_|g_|h_|if_|q_|r_|s_|t_|w_|x_|y_|z_)/.test(firstSegment)) {
    return source;
  }

  const width = DELIVERY_WIDTHS.reduce((closest, allowed) => (
    Math.abs(allowed - requestedWidth) < Math.abs(closest - requestedWidth) ? allowed : closest
  ), DELIVERY_WIDTHS[0]);
  const uploadPathStart = uploadIndex + CLOUDINARY_IMAGE_UPLOAD_PATH.length;
  const prefix = source.slice(0, uploadPathStart);
  // A fixed WebP output keeps the number of stored derivatives predictable;
  // f_auto can create additional format variants for different browsers.
  return `${prefix}c_limit,w_${width}/q_auto/f_webp/${assetPath}`;
}
