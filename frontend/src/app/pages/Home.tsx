import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { API_BASE_URL, apiRequest, resilientFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { CategoryShowcase } from '../components/CategoryShowcase';
import { TrendingStyles } from '../components/TrendingStyles';
import { PromotionalPosters } from '../components/PromotionalPosters';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Product } from '../types/product';

type StorefrontSettings = { bannerUrl: string | null };
type SearchProduct = Product & { _id?: string };
type HeroSlide = { category: string; href: string; image: string; alt: string };

const HERO_ROTATION_MS = 5000;

function normalizeProduct(product: SearchProduct): Product {
  return {
    ...product,
    id: product.id || product._id || '',
    image: product.image || product.images?.[0] || '',
    images: product.images || (product.image ? [product.image] : []),
    brand: typeof product.brand === 'object' ? (product.brand as { name?: string }).name || '' : product.brand || '',
    category: typeof product.category === 'object' ? (product.category as { name?: string }).name || '' : product.category || '',
    description: product.description || '',
    soldBy: product.soldBy || 'piece',
  };
}

function NewArrivalsRail({ products, loading, error }: { products: Product[]; loading: boolean; error: string | null }) {
  const railRef = useRef<HTMLDivElement>(null);
  const moveRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * .9, behavior: 'smooth' });
  };

  return <section className="new-arrivals" aria-labelledby="new-arrivals-title">
    <div className="new-arrivals-heading">
      <div><h2 id="new-arrivals-title">{products.length} new styles just in</h2><span>Fresh arrivals, selected from our latest collection</span></div>
      <div className="new-arrivals-controls" aria-label="New arrival navigation">
        <button type="button" onClick={() => moveRail(-1)} aria-label="Previous new arrivals"><ChevronLeft/></button>
        <button type="button" onClick={() => moveRail(1)} aria-label="Next new arrivals"><ChevronRight/></button>
      </div>
    </div>
    {loading && <div className="storefront-status" role="status">Loading the collection...</div>}
    {error && <div className="storefront-status" role="alert">The collection is taking a moment to load.</div>}
    {!loading && !error && products.length === 0 && <div className="storefront-status" role="status">The new collection will appear here soon.</div>}
    {products.length > 0 && <div ref={railRef} className="new-arrivals-rail">{products.map((product, index) => <Fragment key={product.id}>
      {index === 2 && <Link className="new-arrivals-mobile-view-all" to="/products">View all products <ArrowRight size={15}/></Link>}
      <div className={`new-arrivals-card ${index % 3 === 2 ? 'is-wide' : ''}`}><ProductCard product={product} priority={index < 2} variant="editorial" badge="New"/></div>
    </Fragment>)}</div>}
    {products.length > 0 && <Link className="new-arrivals-view-all new-arrivals-desktop-view-all" to="/products">View all products <ArrowRight size={15}/></Link>}
  </section>;
}

export function Home() {
  usePageTitle();
  const { products, categories, loading, error } = useProductContext();
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('search') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>(initialQuery ? 'loading' : 'idle');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    apiRequest<StorefrontSettings>('/api/v1/catalog/storefront-settings')
      .then((settings) => setBannerUrl(settings.bannerUrl))
      .catch(() => setBannerUrl(null));
  }, []);

  useEffect(() => {
    const nextQuery = params.get('search') || '';
    if (nextQuery !== query) setQuery(nextQuery);
  }, [params]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearchState('idle');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState('loading');
      try {
        const response = await resilientFetch(`${API_BASE_URL}/api/v1/products/search?q=${encodeURIComponent(term)}&limit=12`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Search failed');
        const payload = await response.json();
        const records = payload.data || payload.products || [];
        setResults(records.map(normalizeProduct));
        setSearchState('ready');
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') setSearchState('error');
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchAttempt]);

  const heroSlides = useMemo(() => categories.map((category, index) => {
    const product = products.find((item) => item.category.toLocaleLowerCase() === category.toLocaleLowerCase());
    const image = (index === 0 ? bannerUrl : '') || product?.image || product?.images?.[0] || '';
    return image ? {
      category,
      href: `/category/${encodeURIComponent(category)}`,
      image,
      alt: product ? `${product.name} from the ${category} collection` : `Shop the ${category} collection`,
    } : null;
  }).filter((slide): slide is HeroSlide => Boolean(slide)), [bannerUrl, categories, products]);
  const activeHero = heroSlides[activeHeroIndex] || heroSlides[0];
  const collection = useMemo(() => products.slice(0, 8), [products]);

  useEffect(() => {
    if (activeHeroIndex >= heroSlides.length) setActiveHeroIndex(0);
  }, [activeHeroIndex, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveHeroIndex((index) => (index + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    setParams(term ? { search: term } : {});
  };

  return <div className="storefront bg-white text-[#171717]">
    <form className="storefront-search" role="search" onSubmit={submitSearch}>
      <label htmlFor="product-search" className="sr-only">Search products</label>
      <div className="storefront-search-field"><Search aria-hidden="true" size={20}/><input id="product-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, colour, category or type" autoComplete="off" maxLength={100}/></div>
      <button type="submit" className="storefront-search-submit">Search</button>
    </form>

    {query.trim() ? <section className="storefront-results" aria-labelledby="search-results-title">
      <div className="storefront-section-heading"><p>Search</p><h1 id="search-results-title">Results for “{query.trim()}”</h1></div>
      {searchState === 'loading' && <div className="storefront-status" role="status" aria-live="polite">Searching the collection…</div>}
      {searchState === 'error' && <div className="storefront-status" role="alert">We couldn’t search the collection. <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Try again</button></div>}
      {searchState === 'ready' && results.length === 0 && <div className="storefront-status" role="status">No products match this search. Try a category or another style.</div>}
      {searchState === 'ready' && results.length > 0 && <div className="storefront-product-grid">{results.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} variant="editorial"/>)}</div>}
    </section> : <>
      <section className="storefront-hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="sr-only">Shoe Style featured collection</h1>
        {activeHero ? <>
          <Link to={activeHero.href} className="storefront-hero-link" aria-label={`Shop ${activeHero.category}`}>
            <img key={activeHero.image} src={activeHero.image} alt={activeHero.alt} fetchPriority={activeHeroIndex === 0 ? 'high' : 'auto'}/>
          </Link>
          <Link key={activeHero.category} to={activeHero.href} className="storefront-hero-cta" aria-label={`Shop ${activeHero.category}`}>{activeHero.category}</Link>
          {heroSlides.length > 1 && <div className="storefront-hero-dots" aria-label="Choose a featured category">
            {heroSlides.map((slide, index) => <button key={slide.category} type="button" className={index === activeHeroIndex ? 'is-active' : ''} onClick={() => setActiveHeroIndex(index)} aria-label={`Show ${slide.category} banner`} aria-current={index === activeHeroIndex ? 'true' : undefined}/>) }
          </div>}
        </> : <div className="storefront-hero-skeleton" role="status" aria-label="Loading featured collection"/>}
      </section>
      <section className="storefront-benefits" aria-label="Shopping benefits">
        <div className="storefront-benefits-track">
          <div><strong>Free pan-India delivery</strong><span>Delivered with tracked shipping</span></div>
          <div><strong>Easy size exchange</strong><span>Wrong size? We will help fix it</span></div>
          <div><strong>Secure checkout</strong><span>Protected online payments</span></div>
          <div aria-hidden="true"><strong>Free pan-India delivery</strong><span>Delivered with tracked shipping</span></div>
          <div aria-hidden="true"><strong>Easy size exchange</strong><span>Wrong size? We will help fix it</span></div>
          <div aria-hidden="true"><strong>Secure checkout</strong><span>Protected online payments</span></div>
        </div>
      </section>
      <CategoryShowcase products={products} loading={loading} error={error}/>
      <NewArrivalsRail products={collection} loading={loading} error={error}/>
      <TrendingStyles products={products}/>
      <PromotionalPosters products={products}/>
    </>}
  </div>;
}
