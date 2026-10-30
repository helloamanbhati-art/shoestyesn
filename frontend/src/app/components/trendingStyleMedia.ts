type TrendingMediaProduct = {
  image?: string | null;
  images?: Array<string | null | undefined>;
  variants?: Array<{
    images?: Array<{ imageUrl?: string | null }>;
  }>;
};

const LIFESTYLE_IMAGE_PATTERN = /(?:lifestyle|model|on[-_ ]?foot|worn)/i;

export function selectTrendingStyleMedia(product: TrendingMediaProduct): string {
  const media = [
    product.image,
    ...(product.images ?? []),
    ...(product.variants ?? []).flatMap((variant) =>
      (variant.images ?? []).map((image) => image.imageUrl),
    ),
  ].filter((url): url is string => Boolean(url?.trim()));

  return media.find((url) => LIFESTYLE_IMAGE_PATTERN.test(url)) ?? '';
}
