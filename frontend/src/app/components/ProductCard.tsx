import { Link } from 'react-router';
import { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const variantsCount = product.variants?.length ?? 0;
  const primaryMedia = product.image || product.images?.[0] || '';
  const discountPercentage = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link
      to={`/product/${product.id}`}
      aria-label={`View ${product.name} and choose options`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}
    >
        <Card className="h-full cursor-pointer gap-0 overflow-hidden rounded-none border border-border/70 bg-card p-0 shadow-none transition-colors duration-200 group-hover:border-foreground/25">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            {isVideoMediaUrl(primaryMedia) ? (
              <video
                src={primaryMedia}
                aria-label={`${product.name} product video`}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full select-none object-cover"
              />
            ) : (
              <img
                src={primaryMedia}
                alt={product.name}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                className="h-full w-full select-none object-cover"
              />
            )}

            {variantsCount > 1 && (
              <span className="absolute bottom-2 left-2 rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[11px] font-semibold leading-none text-white shadow-sm backdrop-blur-sm transition-transform duration-200 group-hover:-translate-y-0.5 md:bottom-3 md:left-3 md:text-xs">
                {variantsCount} styles
              </span>
            )}

            {!product.inStock && (
              <Badge
                variant="destructive"
                className="absolute left-2.5 top-2.5 rounded-none border-none bg-red-600 text-[10px] font-semibold text-white shadow-md md:text-xs"
              >
                Out of Stock
              </Badge>
            )}
          </div>

          <CardContent className="flex flex-1 flex-col bg-transparent px-2.5 pb-3 pt-2.5 text-left [&:last-child]:pb-3 md:px-3">
            <p className="truncate text-sm font-semibold text-foreground">{product.brand}</p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-normal leading-5 text-foreground sm:min-h-10 sm:text-[15px]">
              {product.name}
            </h3>
            {product.shortDescription && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 md:text-2xl">
                <span className="align-top text-xs md:text-sm">₹</span>
                {product.price.toLocaleString('en-IN')}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-medium text-foreground">({discountPercentage}% off)</span>
                </>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>

          </CardContent>
        </Card>
    </Link>
  );
}
