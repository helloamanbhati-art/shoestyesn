import { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ProductGrid } from '../components/ProductGrid';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { getEuShoeSize } from '../utils/womenShoeSizes';

type SortOrder = 'featured' | 'price-low' | 'price-high' | 'name';

export function CategoryProducts() {
  const { category = '' } = useParams();
  const { products, loading, error } = useProductContext();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [maximumPrice, setMaximumPrice] = useState(Number.POSITIVE_INFINITY);
  const [sort, setSort] = useState<SortOrder>('featured');
  usePageTitle(category || 'Collection');

  const categoryProducts = products.filter((product) => product.category.toLocaleLowerCase() === category.toLocaleLowerCase());
  const sizes = Array.from(new Set(categoryProducts.flatMap((product) => product.availableSizes || [])));
  const highestPrice = Math.max(0, ...categoryProducts.map((product) => product.price));
  const visibleProducts = useMemo(() => {
    const filtered = categoryProducts.filter((product) => product.price <= maximumPrice && (!selectedSizes.length || selectedSizes.some((size) => product.availableSizes?.includes(size))));
    return [...filtered].sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : 0);
  }, [categoryProducts, maximumPrice, selectedSizes, sort]);

  return (
    <div className="min-h-[70vh] bg-white text-[#0A0A0A]">
      <header className="border-b border-black bg-[#F2F2F2] px-4 py-10 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1600px]">
          <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] underline-offset-4 hover:underline"><ArrowLeft size={17} /> Back home</Link>
          <p className="luxury-eyebrow text-black">The collection</p>
          <h1 className="bold-section-title break-words">{category || 'Products'}</h1>
          {!loading && !error && <p className="mt-4 text-sm text-neutral-600">{visibleProducts.length} of {categoryProducts.length} styles</p>}
        </div>
      </header>
      <div className="sticky top-[104px] z-20 border-b border-black/15 bg-white px-4 py-3 md:top-[112px] md:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <button type="button" onClick={() => setFiltersOpen(true)} className="luxury-button border border-black"><SlidersHorizontal size={15} /> Filters</button>
          <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em]">Sort <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="min-h-11 border border-black bg-white px-3 text-xs normal-case tracking-normal"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
        </div>
      </div>
      <main className="mx-auto max-w-[1600px] py-4 md:py-8">
        {loading ? <div className="grid min-h-96 place-items-center" role="status"><Loader2 className="animate-spin" /></div> : error ? <div className="px-4 py-24 text-center"><h2 className="font-bold">We couldn't load this collection.</h2><p className="mt-2 text-sm text-neutral-600">Please try again shortly.</p></div> : <ProductGrid products={visibleProducts} />}
      </main>
      {filtersOpen && <>
        <button type="button" className="fixed inset-0 z-[60] bg-black/45" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />
        <aside className="fixed bottom-0 right-0 top-0 z-[70] w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" aria-label="Collection filters">
          <div className="flex items-center justify-between"><h2 className="bold-display text-3xl">FILTER</h2><button type="button" onClick={() => setFiltersOpen(false)} className="grid size-11 place-items-center" aria-label="Close filters"><X /></button></div>
          <fieldset className="mt-10 border-t border-black/15 pt-6">
            <legend className="text-xs font-black uppercase tracking-[0.18em]">EU / UK sizes</legend>
            <div className="mt-4 grid grid-cols-4 gap-2">{sizes.map((size) => <button key={size} type="button" aria-pressed={selectedSizes.includes(size)} onClick={() => setSelectedSizes((current) => current.includes(size) ? current.filter((item) => item !== size) : [...current, size])} className={`min-h-11 border text-sm ${selectedSizes.includes(size) ? 'border-black bg-black text-white' : 'border-black/20'}`}>{getEuShoeSize(size)}</button>)}</div>
          </fieldset>
          <fieldset className="mt-8 border-t border-black/15 pt-6">
            <legend className="text-xs font-black uppercase tracking-[0.18em]">Maximum price</legend>
            <input type="range" min="0" max={highestPrice || 1} value={Number.isFinite(maximumPrice) ? maximumPrice : highestPrice} onChange={(event) => setMaximumPrice(Number(event.target.value))} className="mt-5 w-full accent-black" />
            <p className="mt-2 text-sm">Up to ₹{(Number.isFinite(maximumPrice) ? maximumPrice : highestPrice).toLocaleString('en-IN')}</p>
          </fieldset>
          <div className="mt-10 grid grid-cols-2 gap-3"><button type="button" onClick={() => { setSelectedSizes([]); setMaximumPrice(Number.POSITIVE_INFINITY); }} className="luxury-button border border-black">Reset</button><button type="button" onClick={() => setFiltersOpen(false)} className="luxury-button bg-black text-white">View {visibleProducts.length}</button></div>
        </aside>
      </>}
    </div>
  );
}
