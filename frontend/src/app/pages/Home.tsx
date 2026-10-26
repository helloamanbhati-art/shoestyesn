import { useMemo } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Product } from '../types/product';

type RankedProduct = Product & { salesCount?: number };

const moodDefinitions = [
  { title: 'THE HIGH LIFE', category: 'Heels' },
  { title: 'OFF-DUTY ICONS', category: 'Sandals' },
  { title: 'POWER MOVES', category: 'Boots' },
];

function ProductShelf({ products }: { products: Product[] }) {
  return <div className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-4 md:gap-x-5 md:gap-y-10">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} variant="editorial" />)}</div>;
}

export function Home() {
  usePageTitle();
  const { products, loading, error } = useProductContext();
  const latestDrops = products.slice(0, 8);
  const mostLoved = useMemo(() => (products as RankedProduct[]).filter((product) => Number(product.salesCount) > 0).sort((a, b) => Number(b.salesCount) - Number(a.salesCount)).slice(0, 4), [products]);
  const trendingProducts = mostLoved.length > 0 ? mostLoved : products.slice(4, 8);
  const everydayIcons = products.filter((product) => ['flats', 'pumps', 'sandals'].includes(product.category.toLocaleLowerCase())).slice(0, 4);
  const moodCards = moodDefinitions.map((mood, index) => ({ ...mood, product: products.find((product) => product.category.toLocaleLowerCase() === mood.category.toLocaleLowerCase()) || products[index] }));
  const campaignImages = products.map((product) => product.image || product.images?.[0]).filter(Boolean).slice(0, 5);

  return <div className="storefront bg-white text-[#0A0A0A]">
    <section aria-labelledby="campaign-heading" className="relative min-h-[62svh] overflow-hidden bg-[#d8d2c8] md:min-h-[calc(100svh-112px)]">
      <img className="absolute inset-0 h-full w-full object-cover object-center" src="/shoe-style-sale-hero.png" alt="Women wearing heels, trainers and boots in the Shoe Style campaign" fetchPriority="high" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,16,13,.62)_0%,rgba(20,16,13,.12)_56%,rgba(20,16,13,.08)_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-[62svh] max-w-[1720px] items-end px-4 pb-7 text-white md:min-h-[calc(100svh-112px)] md:items-center md:px-12 md:pb-0">
        <div className="max-w-5xl"><p className="luxury-eyebrow">Shoe Style — Not just shoes. A statement.</p><h1 id="campaign-heading" className="bold-display mt-3 text-[clamp(3.35rem,16vw,13rem)] md:mt-5">WALK LOUD.</h1><p className="mt-2 text-sm font-black uppercase tracking-[-0.02em] md:mt-3 md:text-4xl">YOUR STYLE. YOUR RULES.</p><div className="mt-5 flex flex-wrap gap-2 md:mt-8 md:gap-3"><a href="#latest-drops" className="luxury-button bg-black text-white hover:bg-white hover:text-black">Shop now <ArrowRight size={17}/></a><a href="#latest-drops" className="luxury-button border border-white text-white hover:bg-white hover:text-black">Explore new arrivals</a></div></div>
      </div>
    </section>
    <div className="border-y border-white/20 bg-black px-3 py-2 text-center text-[8px] font-black uppercase tracking-[0.16em] text-white md:px-4 md:py-2.5 md:text-[10px] md:tracking-[0.2em]">Easy returns · Secure checkout · Shipping pan India</div>

    <section id="latest-drops" aria-labelledby="latest-drops-title" className="luxury-section bg-white"><div className="luxury-container"><div className="luxury-heading-row"><div><p className="luxury-eyebrow text-black">New in</p><h2 id="latest-drops-title" className="bold-section-title">LATEST DROPS</h2></div></div>{loading ? <div className="grid min-h-80 place-items-center"><Loader2 className="animate-spin"/></div> : error ? <p className="py-20 text-center text-sm text-neutral-600">The collection is taking a moment to load.</p> : <ProductShelf products={latestDrops}/>}</div></section>

    <section aria-labelledby="for-her-title" className="relative min-h-[54svh] overflow-hidden bg-black md:min-h-[72svh]"><img src="/shoe-style-sale-hero.png" alt="Shoe Style women's footwear campaign" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[70%_center]"/><div className="absolute inset-0 bg-black/45"/><div className="relative z-10 mx-auto flex min-h-[54svh] max-w-[1720px] items-end px-4 py-8 text-white md:min-h-[72svh] md:px-12 md:py-16"><div><p className="luxury-eyebrow text-white">Every mood. Every moment. Every step.</p><h2 id="for-her-title" className="bold-display mt-3 max-w-5xl text-[clamp(3.75rem,16vw,13rem)] md:mt-4">FOR HER.</h2><Link to="/category/Heels" className="luxury-button mt-5 border border-white text-white hover:bg-white hover:text-black md:mt-8">Shop the edit <ArrowRight size={17}/></Link></div></div></section>

    <section aria-labelledby="statement-title" className="luxury-section bg-[#F2F2F2]"><div className="luxury-container"><p className="luxury-eyebrow text-black">Choose your statement</p><h2 id="statement-title" className="bold-section-title">MAKE YOUR MOVE</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{moodCards.map((mood) => { const image = mood.product?.image || mood.product?.images?.[0] || '/shoe-style-sale-hero.png'; return <Link key={mood.title} to={`/category/${encodeURIComponent(mood.category)}`} className="group relative aspect-[4/5] overflow-hidden bg-neutral-200"><img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"/><span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/><span className="absolute bottom-6 left-6 right-6 text-white"><span className="bold-display block text-4xl md:text-5xl">{mood.title}</span><span className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">Shop {mood.category} <ArrowRight size={14}/></span></span></Link>; })}</div></div></section>

    {trendingProducts.length > 0 && <section aria-labelledby="trending-title" className="luxury-section bg-white"><div className="luxury-container"><p className="luxury-eyebrow text-black">{mostLoved.length ? 'Ranked by real sales' : 'Featured by Shoe Style'}</p><h2 id="trending-title" className="bold-section-title">TRENDING RIGHT NOW</h2><div className="mt-10"><ProductShelf products={trendingProducts}/></div></div></section>}

    <section aria-labelledby="energy-title" className="relative min-h-[70svh] overflow-hidden bg-[#0A0A0A] text-white"><img src="/shoe-style-sale-hero.png" alt="Bold Shoe Style footwear campaign" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50"/><div className="relative z-10 mx-auto flex min-h-[70svh] max-w-[1720px] items-center justify-center px-5 text-center"><div><h2 id="energy-title" className="bold-display text-[clamp(4rem,11vw,11rem)]">GOOD SHOES.<br/><span className="text-white">BIG ENERGY.</span></h2><a href="#latest-drops" className="luxury-button mt-8 bg-white text-black hover:bg-neutral-200">Shop the collection <ArrowRight size={17}/></a></div></div></section>

    {everydayIcons.length > 0 && <section aria-labelledby="icons-title" className="luxury-section bg-[#F2F2F2]"><div className="luxury-container"><p className="luxury-eyebrow text-black">Made for every day</p><h2 id="icons-title" className="bold-section-title">EVERYDAY ICONS</h2><div className="mt-10"><ProductShelf products={everydayIcons}/></div></div></section>}

    {campaignImages.length > 0 && <section aria-labelledby="studies-title" className="overflow-hidden bg-white py-16 md:py-24"><div className="luxury-container mb-9"><p className="luxury-eyebrow text-black">Shoe Style community</p><h2 id="studies-title" className="bold-section-title">CAMPAIGN STUDIES</h2><p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600">Approved brand and product media, ready for future social integration.</p></div><div className="flex snap-x gap-2 overflow-x-auto px-4 pb-3 md:px-8">{campaignImages.map((image, index) => <div key={`${image}-${index}`} className="w-[72vw] shrink-0 snap-start overflow-hidden bg-[#F2F2F2] sm:w-[44vw] lg:w-[27vw]"><img src={image} alt="Shoe Style community campaign" loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-[1.03]"/></div>)}</div></section>}
  </div>;
}
