import { ArrowLeft, Loader2 } from 'lucide-react';
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
        {loading ? <div className="grid min-h-96 place-items-center" role="status"><Loader2 className="animate-spin" /></div> : error ? <div className="px-4 py-24 text-center"><h2 className="font-bold">We couldn't load this collection.</h2><p className="mt-2 text-sm text-neutral-600">Please try again shortly.</p></div> : <ProductGrid products={categoryProducts} />}
      </main>
    </div>
  );
}
