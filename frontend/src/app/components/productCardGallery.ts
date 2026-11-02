type ProductCardMediaSource = {
  image?: string | null;
  images?: Array<string | null | undefined>;
  variants?: Array<{
    variantId?: string;
    variantName?: string;
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

export function getProductVariantPreviews(product: ProductCardMediaSource) {
  return (product.variants ?? []).flatMap((variant, index) => {
    const image = variant.images?.find((candidate) => Boolean(candidate.imageUrl?.trim()))?.imageUrl?.trim();
    if (!image) return [];
    return [{
      id: variant.variantId || `${variant.variantName || 'variant'}-${index}`,
      name: variant.variantName || `Variant ${index + 1}`,
      image,
    }];
  });
}
