const MAX_IMAGE_DIMENSION = 1600;
const MAX_UNOPTIMIZED_BYTES = 1_000_000;

export async function optimizeMediaForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size <= MAX_UNOPTIMIZED_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
    return new File([blob], `${baseName}.webp`, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export { MAX_IMAGE_DIMENSION, MAX_UNOPTIMIZED_BYTES };
