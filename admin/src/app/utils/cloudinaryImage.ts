const CLOUDINARY_UPLOAD_PATH = '/image/upload/';
const WIDTHS = [160, 480, 960, 1280] as const;

export function getCloudinaryImageUrl(source: string, requestedWidth: number): string {
  if (!source || !source.includes('res.cloudinary.com')) return source;
  const uploadIndex = source.indexOf(CLOUDINARY_UPLOAD_PATH);
  if (uploadIndex < 0) return source;

  const assetPath = source.slice(uploadIndex + CLOUDINARY_UPLOAD_PATH.length);
  const firstSegment = assetPath.split('/')[0];
  if (/^(?:a_|b_|c_|dpr_|e_|f_|fl_|g_|h_|if_|q_|r_|s_|t_|w_|x_|y_|z_)/.test(firstSegment)) return source;

  const width = WIDTHS.reduce((closest, allowed) => (
    Math.abs(allowed - requestedWidth) < Math.abs(closest - requestedWidth) ? allowed : closest
  ), WIDTHS[0]);
  const prefix = source.slice(0, uploadIndex + CLOUDINARY_UPLOAD_PATH.length);
  return `${prefix}c_limit,w_${width}/q_auto/f_webp/${assetPath}`;
}
