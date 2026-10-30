import { Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';

interface CategoryShowcaseProps {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export function CategoryShowcase({ products, loading, error }: CategoryShowcaseProps) {
  const categoryPriority = ['Sandals', 'Boots', 'Heels'];
  const representatives = products.reduce((categoryProducts, product) => {
    const category = product.category?.trim().toLocaleLowerCase();
    if (category && !categoryProducts.has(category)) categoryProducts.set(category, product);
    return categoryProducts;
  }, new Map<string, Product>());
  const categoryProducts = Array.from(representatives.values()).sort((first, second) => {
    const firstPriority = categoryPriority.indexOf(first.category);
    const secondPriority = categoryPriority.indexOf(second.category);
    if (firstPriority !== -1 || secondPriority !== -1) {
      return (firstPriority === -1 ? categoryPriority.length : firstPriority)
        - (secondPriority === -1 ? categoryPriority.length : secondPriority);
    }
    return first.category.localeCompare(second.category);
  });

  return (
    <section
      aria-label="Product categories"
      className={`category-showcase${categoryProducts.length > 0 && categoryProducts.length <= 4 ? ' is-single-row' : ''}`}
    >
      <div>
        {loading ? (
          <div className="flex min-h-72 items-center justify-center" role="status" aria-label="Loading categories">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : error ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">Categories are taking a moment to load.</p>
        ) : categoryProducts.length === 0 ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">New collections are coming soon.</p>
        ) : (
          <div className="category-showcase-rail">
            {categoryProducts.map((product, index) => {
              const media = product.image || product.images?.[0] || '';
              return (
                <Link
                  key={product.category}
                  to={`/category/${encodeURIComponent(product.category)}`}
                  aria-label={`Shop all ${product.category} products`}
                  className="category-showcase-card"
                >
                  <div>
                    {isVideoMediaUrl(media) ? (
                      <video src={media} muted loop autoPlay playsInline preload="metadata" />
                    ) : (
                      <img src={media} alt="" loading={index < 4 ? 'eager' : 'lazy'} fetchPriority={index < 4 ? 'high' : 'auto'} />
                    )}
                  </div>
                  <h3>{product.category}</h3>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
