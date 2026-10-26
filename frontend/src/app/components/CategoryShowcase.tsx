import { ArrowUpRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { Product } from '../types/product';
import { isVideoMediaUrl } from '../utils/media';

interface CategoryShowcaseProps {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export function CategoryShowcase({ products, loading, error }: CategoryShowcaseProps) {
  const categoryProducts = Array.from(
    products.reduce((representatives, product) => {
      const category = product.category?.trim();
      if (category && !representatives.has(category)) representatives.set(category, product);
      return representatives;
    }, new Map<string, Product>()),
    ([, product]) => product,
  );

  return (
    <section aria-labelledby="category-showcase-heading" className="bg-white px-4 py-12 text-[#171717] md:px-8 md:py-20">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-7 md:mb-10">
          <p className="eyebrow text-neutral-500">Find your pair</p>
          <h2 id="category-showcase-heading" className="section-title">SHOP BY CATEGORY</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600 md:text-base">
            One pick from every collection. Choose a category to see every style in it.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center" role="status" aria-label="Loading categories">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : error ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">Categories are taking a moment to load.</p>
        ) : categoryProducts.length === 0 ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">New collections are coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 md:grid-cols-3 lg:grid-cols-4">
            {categoryProducts.map((product, index) => {
              const media = product.image || product.images?.[0] || '';
              return (
                <Link
                  key={product.category}
                  to={`/category/${encodeURIComponent(product.category)}`}
                  aria-label={`Shop all ${product.category} products`}
                  className="group min-w-0 bg-white focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f1eee8]">
                    {isVideoMediaUrl(media) ? (
                      <video src={media} muted loop autoPlay playsInline preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                    ) : (
                      <img src={media} alt="" loading={index < 4 ? 'eager' : 'lazy'} fetchPriority={index < 4 ? 'high' : 'auto'} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                    )}
                    <span className="absolute left-3 top-3 bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white md:left-4 md:top-4">Explore</span>
                  </div>
                  <div className="flex min-h-20 items-center justify-between gap-2 px-3 py-4 md:min-h-24 md:px-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black uppercase tracking-[-0.02em] md:text-xl">{product.category}</h3>
                      <p className="mt-1 truncate text-xs text-neutral-500">Featuring {product.name}</p>
                    </div>
                    <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
