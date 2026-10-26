import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { ProductGrid } from '../components/ProductGrid';
import { useAuth } from '../contexts/AuthContext';
import { useProductContext } from '../contexts/ProductContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { fetchWishlistIds } from '../wishlist/wishlistApi';

export function Wishlist() {
  usePageTitle('Wishlist');
  const { isAuthenticated, status, openLogin } = useAuth();
  const { products, loading: productsLoading } = useProductContext();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setIds([]); return; }
    setLoading(true);
    fetchWishlistIds().then(setIds).catch(() => setError('Your wishlist could not be loaded.')).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const savedProducts = products.filter((product) => ids.includes(product.id));
  return <main className="min-h-[70vh] bg-white px-4 py-14 md:px-8 md:py-20"><div className="mx-auto max-w-[1600px]"><p className="luxury-eyebrow text-black">Saved for later</p><h1 className="luxury-section-title">WISHLIST</h1>{status === 'loading' || loading || productsLoading ? <div className="grid min-h-72 place-items-center" role="status"><Loader2 className="animate-spin"/></div> : !isAuthenticated ? <div className="mt-12 border-t border-black/15 py-16 text-center"><Heart className="mx-auto mb-5"/><p className="font-serif text-3xl italic">Keep the pairs you love close.</p><button type="button" onClick={openLogin} className="luxury-button mt-7 border border-black">Sign in to view wishlist</button></div> : error ? <p className="mt-12 border-t border-black/15 py-16 text-center">{error}</p> : savedProducts.length ? <div className="mt-10"><ProductGrid products={savedProducts}/></div> : <div className="mt-12 border-t border-black/15 py-16 text-center"><Heart className="mx-auto mb-5"/><p className="font-serif text-3xl italic">Your wishlist is waiting.</p><p className="mt-3 text-sm text-neutral-600">Save a style from its product page and it will appear here.</p></div>}</div></main>;
}
