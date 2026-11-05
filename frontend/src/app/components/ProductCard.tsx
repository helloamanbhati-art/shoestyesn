import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Share2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useCart } from '../contexts/CartContext';
import { getProductCardMedia, getProductVariantPreviews } from './productCardGallery';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  variant?: 'catalog' | 'editorial';
  badge?: string;
}

export function ProductCard({ product, priority = false, variant = 'catalog', badge }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const galleryMedia = getProductCardMedia(product);
  const variantPreviews = getProductVariantPreviews(product);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const mobileViewportRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasDiscount = (product.compareAtPrice ?? 0) > product.price;
  const discountPercentage = hasDiscount
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const isEditorial = variant === 'editorial';

  const stopGalleryAutoplay = () => {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  };

  const advanceGallery = () => {
    setActiveImageIndex((current) => {
      const next = (current + 1) % galleryMedia.length;
      const viewport = mobileViewportRef.current;
      if (viewport?.clientWidth) {
        viewport.scrollTo({ left: next * viewport.clientWidth, behavior: 'smooth' });
      }
      return next;
    });
  };

  const startGalleryAutoplay = () => {
    if (
      galleryMedia.length < 2
      || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches
    ) return;

    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    autoplayTimer.current = setInterval(advanceGallery, 1100);
  };

  const startMobileGalleryAutoplay = () => {
    if (
      galleryMedia.length < 2
      || window.matchMedia('(min-width: 768px)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    autoplayTimer.current = setInterval(advanceGallery, 2500);
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card || galleryMedia.length < 2) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) startMobileGalleryAutoplay();
      else stopGalleryAutoplay();
    }, { threshold: 0.55 });

    observer.observe(card);
    return () => {
      observer.disconnect();
      stopGalleryAutoplay();
    };
  }, [galleryMedia.length]);

  const handleMobileScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    if (!viewport.clientWidth) return;
    setActiveImageIndex(Math.min(
      galleryMedia.length - 1,
      Math.max(0, Math.round(viewport.scrollLeft / viewport.clientWidth)),
    ));
  };

  const quickAdd = async () => {
    if (!product.inStock) return;
    const sizes = product.availableSizes || [];
    if (sizes.length > 1) { navigate(`/product/${product.id}`); return; }
    const added = await addToCart(product, undefined, sizes[0]);
    if (added) toast.success(`${product.name} added to your bag.`);
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = new URL(`/share/product/${encodeURIComponent(product.id)}`, window.location.origin);
    const shareData = {
      title: product.name,
      text: `Take a look at ${product.name} from Shoe Style.`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Product link copied');
      } else {
        window.prompt('Copy this product link', shareData.url);
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      toast.error('Unable to share this product');
    }
  };

  return (
    <div ref={cardRef} className="group relative h-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}>
    <Link
      to={`/product/${product.id}`}
      aria-label={`View ${product.name} and choose options`}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
    >
        <Card className={`h-full cursor-pointer gap-0 overflow-hidden rounded-none bg-card p-0 shadow-none ${isEditorial ? 'border-0' : 'border border-border/70 transition-colors duration-200 group-hover:border-foreground/25'}`}>
          <div className="relative aspect-[4/5] overflow-hidden bg-muted" onMouseEnter={startGalleryAutoplay} onMouseLeave={stopGalleryAutoplay}>
            <div
              ref={mobileViewportRef}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:hidden"
              onScroll={handleMobileScroll}
              onTouchStart={stopGalleryAutoplay}
              onTouchEnd={startMobileGalleryAutoplay}
              aria-label={`${product.name} image gallery. Swipe to view more images.`}
            >
              {galleryMedia.map((media, index) => isVideoMediaUrl(media) ? (
                <video key={media} src={media} aria-label={`Image ${index + 1} of ${galleryMedia.length}`} muted loop autoPlay playsInline preload="metadata" className="h-full w-full shrink-0 snap-center select-none object-cover" />
              ) : (
                <img key={media} src={media} alt={index === 0 ? product.name : `${product.name}, view ${index + 1}`} aria-label={`Image ${index + 1} of ${galleryMedia.length}`} loading={priority && index === 0 ? 'eager' : 'lazy'} fetchPriority={priority && index === 0 ? 'high' : 'auto'} decoding="async" draggable={false} className="h-full w-full shrink-0 snap-center select-none object-cover" />
              ))}
            </div>

            <div className="relative hidden h-full w-full md:block" aria-live="off">
              {galleryMedia.map((media, index) => isVideoMediaUrl(media) ? (
                <video key={media} src={media} aria-label={`${product.name} product video ${index + 1}`} muted loop autoPlay playsInline preload="metadata" className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-300 ${index === activeImageIndex ? 'opacity-100' : 'opacity-0'}`} />
              ) : (
                <img key={media} src={media} alt={index === 0 ? product.name : ''} loading={priority && index === 0 ? 'eager' : 'lazy'} fetchPriority={priority && index === 0 ? 'high' : 'auto'} decoding="async" className={`absolute inset-0 h-full w-full select-none object-cover transition duration-300 ${index === activeImageIndex ? 'opacity-100' : 'opacity-0'} ${isEditorial && galleryMedia.length === 1 ? 'group-hover:scale-[1.025]' : ''}`} />
              ))}
            </div>

            {galleryMedia.length > 1 && (
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1.5 backdrop-blur-sm md:bottom-3" role="img" aria-label={`Product image position ${activeImageIndex + 1} of ${galleryMedia.length}`}>
                {galleryMedia.map((media, index) => (
                  <span key={media} className={`size-1.5 rounded-full transition-colors ${index === activeImageIndex ? 'bg-white' : 'bg-white/45'}`} aria-hidden="true" />
                ))}
              </div>
            )}

            {badge && (
              <span className="absolute left-3 top-3 bg-black px-3 py-1.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.12em] text-white md:left-4 md:top-4">
                {badge}
              </span>
            )}

            <button
              type="button"
              onClick={handleShare}
              aria-label={`Share ${product.name}`}
              title="Share product"
              className="absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full bg-white/95 text-neutral-900 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <Share2 size={17} aria-hidden="true" />
            </button>

            {!product.inStock && (
              <Badge
                variant="destructive"
                className="absolute left-2.5 top-2.5 rounded-none border-none bg-black text-[10px] font-semibold text-white shadow-md md:text-xs"
              >
                Out of Stock
              </Badge>
            )}
          </div>

          {variantPreviews.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-2 pt-2 md:px-3 md:pt-3" role="list" aria-label={`${product.name} available variants`}>
              {variantPreviews.map((preview) => (
                <span key={preview.id} className="block size-8 shrink-0 overflow-hidden rounded-full border border-neutral-300 bg-white p-0.5 md:size-10" role="listitem" title={preview.name}>
                  <img src={preview.image} alt={`${product.name} in ${preview.name}`} loading="lazy" decoding="async" className="h-full w-full rounded-full object-cover" />
                </span>
              ))}
            </div>
          )}

          <CardContent className={`flex flex-1 flex-col bg-transparent text-left ${isEditorial ? 'px-0 pb-2 pt-2.5 [&:last-child]:pb-2 md:pt-4' : 'px-2 pb-2.5 pt-2 [&:last-child]:pb-2.5 md:px-3 md:pb-3 md:pt-2.5 md:[&:last-child]:pb-3'}`}>
            <h3 className="line-clamp-2 min-h-8 text-xs font-medium uppercase leading-4 tracking-[0.08em] text-[#26314a] md:min-h-10 md:text-sm md:leading-5">
              {product.name}
            </h3>
            {!isEditorial && product.shortDescription && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {product.shortDescription}
              </p>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-extrabold leading-none text-[#111827] md:text-base">
                ₹ {product.price.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[11px] leading-none text-neutral-400 line-through md:text-xs">
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white md:text-[10px]">
                    -{discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

          </CardContent>
        </Card>
    </Link>
    {!isEditorial && <button type="button" onClick={() => void quickAdd()} disabled={!product.inStock} className="absolute bottom-[5.8rem] left-3 right-3 z-10 hidden min-h-11 items-center justify-center gap-2 bg-black px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 md:flex md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"><ShoppingBag size={15}/>{(product.availableSizes?.length || 0) > 1 ? 'Choose size' : 'Quick add'}</button>}
    </div>
  );
}
