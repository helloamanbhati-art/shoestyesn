import { MessageCircle } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { CartIconProvider, useCartIcon } from '../contexts/CartIconContext';
import { STORE } from '../config/store';

function LayoutContent() {
  const { setCartIconElement } = useCartIcon();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar onCartIconReady={setCartIconElement} />
      <main className="flex-1 pt-[72px] md:pt-[102px]"><Outlet /></main>
      <footer className="storefront-footer"><div><p className="storefront-footer-brand">Shoe Style</p><p>Footwear for every step, available in sizes {STORE.availableSizes}.</p></div><nav aria-label="Footer navigation"><Link to="/about-us">Our story</Link><Link to="/shipping-delivery">Delivery &amp; exchange</Link><Link to="/contact-us">Contact</Link><Link to="/privacy-policy">Privacy</Link></nav><small>© {new Date().getFullYear()} Shoe Style</small></footer>
      <a className="storefront-support" href={`https://wa.me/91${STORE.whatsappNumbers[0]}`} target="_blank" rel="noreferrer" aria-label="Customer support on WhatsApp"><MessageCircle aria-hidden="true"/><span>Chat</span></a>
    </div>
  );
}

export function Layout() {
  return <CartIconProvider><LayoutContent /></CartIconProvider>;
}
