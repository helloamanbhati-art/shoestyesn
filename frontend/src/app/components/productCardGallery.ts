type ProductCardMediaSource = {
  image?: string | null;
  images?: Array<string | null | undefined>;
  variants?: Array<{
    images?: Array<{ imageUrl?: string | null }>;
  }>;
};

export function getProductCardMedia(product: ProductCardMediaSource): string[] {
  const media = [
    product.image,
    ...(product.images ?? []),
    ...(product.variants ?? []).flatMap((variant) =>
      (variant.images ?? []).map((image) => image.imageUrl),
    ),
  ].filter((url): url is string => Boolean(url));

  return [...new Set(media)];
}
