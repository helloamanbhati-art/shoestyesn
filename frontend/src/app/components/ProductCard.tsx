import { Link, useNavigate } from 'react-router';
import { Heart, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { addWishlistProduct } from '../wishlist/wishlistApi';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  variant?: 'catalog' | 'editorial';
  badge?: string;
}

export function ProductCard({ product, priority = false, variant = 'catalog', badge }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, openLogin } = useAuth();
  const variantsCount = product.variants?.length ?? 0;
  const primaryMedia = product.image || product.images?.[0] || '';
  const secondaryMedia = product.images?.find((image) => image && image !== primaryMedia)
    || product.variants?.flatMap((variant) => variant.images || []).map((image) => image.imageUrl).find((image) => image && image !== primaryMedia);
  const hasDiscount = (product.compareAtPrice ?? 0) > product.price;
  const discountPercentage = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const isEditorial = variant === 'editorial';

  const quickAdd = async () => {
    if (!product.inStock) return;
    const sizes = product.availableSizes || [];
    if (sizes.length > 1) { navigate(`/product/${product.id}`); return; }
    const added = await addToCart(product, undefined, sizes[0]);
    if (added) toast.success(`${product.name} added to your bag.`);
  };

  const save = async () => {
    if (!isAuthenticated) { openLogin(); return; }
    try { await addWishlistProduct(product.id); toast.success('Saved to your wishlist.'); }
    catch { toast.error('This style could not be saved.'); }
  };

  return (
    <div className="group relative h-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}>
    <Link
      to={`/product/${product.id}`}
      aria-label={`View ${product.name} and choose options`}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
    >
        <Card className={`h-full cursor-pointer gap-0 overflow-hidden rounded-none bg-card p-0 shadow-none ${isEditorial ? 'border-0' : 'border border-border/70 transition-colors duration-200 group-hover:border-foreground/25'}`}>
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
                className={`h-full w-full select-none object-cover ${isEditorial ? 'transition-transform duration-500 ease-out group-hover:scale-[1.025]' : ''}`}
              />
            ) : (
              <img
                src={primaryMedia}
                alt={product.name}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                className={`h-full w-full select-none object-cover transition duration-500 ${secondaryMedia ? 'group-hover:opacity-0' : isEditorial ? 'group-hover:scale-[1.025]' : ''}`}
              />
            )}

            {secondaryMedia && !isVideoMediaUrl(secondaryMedia) && (
              <img src={secondaryMedia} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full select-none object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            )}

            {badge && (
              <span className="absolute left-3 top-3 bg-black px-3 py-1.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.12em] text-white md:left-4 md:top-4">
                {badge}
              </span>
            )}

            {variantsCount > 1 && (
              <span className="absolute bottom-2 left-2 rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[11px] font-semibold leading-none text-white shadow-sm backdrop-blur-sm transition-transform duration-200 group-hover:-translate-y-0.5 md:bottom-3 md:left-3 md:text-xs">
                {variantsCount} styles
              </span>
            )}

            {!product.inStock && (
              <Badge
                variant="destructive"
                className="absolute left-2.5 top-2.5 rounded-none border-none bg-black text-[10px] font-semibold text-white shadow-md md:text-xs"
              >
                Out of Stock
              </Badge>
            )}
          </div>

          <CardContent className={`flex flex-1 flex-col bg-transparent text-left ${isEditorial ? 'px-0 pb-2 pt-2.5 [&:last-child]:pb-2 md:pt-4' : 'px-2 pb-2.5 pt-2 [&:last-child]:pb-2.5 md:px-3 md:pb-3 md:pt-2.5 md:[&:last-child]:pb-3'}`}>
            <h3 className={isEditorial ? 'line-clamp-2 min-h-8 text-xs font-bold leading-[1.3] tracking-[-0.01em] text-[#171717] md:min-h-11 md:text-lg' : 'line-clamp-2 text-xs font-semibold leading-4 text-foreground sm:min-h-10 sm:text-[15px] sm:font-normal sm:leading-5'}>
              {product.name}
            </h3>
            {!isEditorial && product.shortDescription && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            <div className={`${isEditorial ? 'mt-1.5' : 'mt-2'} flex flex-wrap items-baseline gap-x-2 gap-y-1`}>
              <span className={isEditorial ? 'text-xs font-extrabold text-[#171717] md:text-base' : 'text-sm font-bold text-[#0A0A0A] md:text-2xl md:font-semibold'}>
                <span className="align-top text-[9px] md:text-sm">₹</span>
                {product.price.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <>
                  <span className={`${isEditorial ? 'text-sm text-neutral-400 md:text-base' : 'text-xs text-muted-foreground'} line-through`}>
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                  {!isEditorial && <span className="text-xs font-medium text-foreground">({discountPercentage}% off)</span>}
                </>
              )}
            </div>

            {!isEditorial && <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>}

          </CardContent>
        </Card>
    </Link>
    <button type="button" onClick={() => void save()} className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-white/95 text-black opacity-100 transition hover:bg-black hover:text-white md:right-3 md:top-3 md:size-10 md:rounded-none md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" aria-label={`Add ${product.name} to wishlist`}><Heart size={15}/></button>
    <button type="button" onClick={() => void quickAdd()} disabled={!product.inStock} className="absolute bottom-[5.8rem] left-3 right-3 z-10 hidden min-h-11 items-center justify-center gap-2 bg-black px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 md:flex md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"><ShoppingBag size={15}/>{(product.availableSizes?.length || 0) > 1 ? 'Choose size' : 'Quick add'}</button>
    </div>
  );
}
