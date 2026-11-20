const MAX_IMAGE_DIMENSION = 1600;
const MAX_UNOPTIMIZED_BYTES = 1_000_000;

export async function optimizeMediaForUpload(file: File): Promise<File> {
  if (
    !file.type.startsWith('image/')
    || file.type === 'image/gif'
    || file.type === 'image/svg+xml'
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    if (file.type === 'image/webp' && file.size <= MAX_UNOPTIMIZED_BYTES && longestSide <= MAX_IMAGE_DIMENSION) {
      bitmap.close();
      return file;
    }
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
    return new File([blob], `${baseName}.webp`, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export { MAX_IMAGE_DIMENSION, MAX_UNOPTIMIZED_BYTES };
