import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';
import { selectTrendingStyleMedia } from './trendingStyleMedia';

interface TrendingStylesProps {
  products: Product[];
}

export function TrendingStyles({ products }: TrendingStylesProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const styles = products.filter((product) => selectTrendingStyleMedia(product));

  if (styles.length === 0) return null;

  const moveRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({
      left: direction * railRef.current.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="trending-styles" aria-labelledby="trending-styles-title">
      <header className="trending-styles-heading">
        <button type="button" onClick={() => moveRail(-1)} aria-label="Previous trending styles">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div>
          <h2 id="trending-styles-title">Trending Styles</h2>
          <Link to="/products">View all</Link>
        </div>
        <button type="button" onClick={() => moveRail(1)} aria-label="Next trending styles">
          <ChevronRight aria-hidden="true" />
        </button>
      </header>

      <div ref={railRef} className="trending-styles-rail">
        {styles.map((product) => {
          const media = selectTrendingStyleMedia(product);
          return (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="trending-styles-card"
              aria-label={`View ${product.name}`}
            >
              {isVideoMediaUrl(media) ? (
                <video src={media} muted loop playsInline preload="none" />
              ) : (
                <img src={media} alt={product.name} loading="lazy" decoding="async" />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
