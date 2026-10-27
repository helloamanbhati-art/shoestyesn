import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Loader2, SlidersHorizontal, X } from 'lucide-react';
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
  usePageTitle(category || 'Products');

  const categoryProducts = category
    ? products.filter((product) => product.category.toLocaleLowerCase() === category.toLocaleLowerCase())
    : products;
  const sizes = Array.from(new Set(categoryProducts.flatMap((product) => product.availableSizes || [])));
  const highestPrice = Math.max(0, ...categoryProducts.map((product) => product.price));
  const visibleProducts = useMemo(() => {
    const filtered = categoryProducts.filter((product) => product.price <= maximumPrice && (!selectedSizes.length || selectedSizes.some((size) => product.availableSizes?.includes(size))));
    return [...filtered].sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'name' ? a.name.localeCompare(b.name) : 0);
  }, [categoryProducts, maximumPrice, selectedSizes, sort]);

  return (
    <div className="min-h-[70vh] bg-white text-[#0A0A0A]">
      <header className="bg-[#F7F3ED] px-3 py-3 md:px-8 md:py-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 md:gap-10">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" aria-label="Back to collections" className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <h1 className="font-display break-words text-[1.75rem] leading-none tracking-[-0.04em] text-[#171412] md:text-[2.25rem]">{category || 'Products'}</h1>
          </div>
          {!loading && !error && (
            <p className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-neutral-600 md:gap-2 md:text-sm">
              <span className="size-1 rounded-full bg-[#8A5A44] md:size-1.5" aria-hidden="true" />
              {visibleProducts.length} of {categoryProducts.length} styles
            </p>
          )}
        </div>
      </header>
      <div className="sticky top-[104px] z-20 border-b border-black/10 bg-white/95 px-3 py-2 backdrop-blur md:top-[112px] md:px-8 md:py-3">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2 md:flex md:items-center md:justify-between md:gap-4">
          <button type="button" onClick={() => setFiltersOpen(true)} className="luxury-button min-h-9 w-full rounded-full bg-[#F3EFE9] text-[#171412] hover:bg-[#E8E0D7] md:min-h-10 md:w-auto">
            <SlidersHorizontal size={15} aria-hidden="true" /> Filters
            {(selectedSizes.length > 0 || Number.isFinite(maximumPrice)) && <span className="grid size-5 place-items-center rounded-full bg-black text-[10px] text-white" aria-label="Filters applied">{selectedSizes.length + (Number.isFinite(maximumPrice) ? 1 : 0)}</span>}
          </button>
          <label className="relative block min-w-0">
            <span className="sr-only">Sort products</span>
            <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="min-h-9 w-full appearance-none rounded-full border border-black/15 bg-white px-3 pr-9 text-[11px] font-semibold text-[#171412] outline-none transition-colors hover:border-black/40 focus:border-black md:min-h-10 md:min-w-48 md:px-4 md:pr-10 md:text-xs">
              <option value="featured">Sort: Featured</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="name">Name: A to Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2" aria-hidden="true" />
          </label>
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
