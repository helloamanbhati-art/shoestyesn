import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ProductGrid } from '../components/ProductGrid';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function CategoryProducts() {
  const { category = '' } = useParams();
  const { products, loading, error } = useProductContext();
  usePageTitle(category || 'Products');

  const categoryProducts = category
    ? products.filter((product) => product.category.toLocaleLowerCase() === category.toLocaleLowerCase())
    : products;

  return (
    <div className="min-h-[70vh] bg-white text-[#0A0A0A]">
      <main className="mx-auto max-w-[1600px] py-4 md:py-8">
        <div className="px-3 pb-4 md:px-8 md:pb-6">
          <Link to="/" aria-label="Back to collections" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#171412] transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Back</span>
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-1 md:grid-cols-3 md:gap-6 md:px-6 lg:grid-cols-4" role="status" aria-label="Loading collection" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="animate-pulse" aria-hidden="true">
                <div className="aspect-[3/4] bg-neutral-100" />
                <div className="mt-3 h-3 w-3/4 bg-neutral-100" />
                <div className="mt-2 h-3 w-1/3 bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-24 text-center" role="alert">
            <h2 className="font-bold">We couldn't load this collection.</h2>
            <p className="mt-2 text-sm text-neutral-600">Please try again shortly or browse the complete collection.</p>
            <Link to="/products" className="mt-6 inline-flex min-h-11 items-center border border-black px-5 text-sm font-semibold">Browse all products</Link>
          </div>
        ) : <ProductGrid products={categoryProducts} />}
      </main>
    </div>
  );
}
