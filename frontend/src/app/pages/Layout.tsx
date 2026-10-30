import { MessageCircle } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { CartIconProvider, useCartIcon } from '../contexts/CartIconContext';
import { STORE } from '../config/store';
import { VisitorTracker } from '../analytics/VisitorTracker';

function LayoutContent() {
  const { setCartIconElement } = useCartIcon();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <VisitorTracker />
      <Navbar onCartIconReady={setCartIconElement} />
      <main className="flex-1 pt-[72px] md:pt-[102px]"><Outlet /></main>
      <footer className="storefront-footer">
        <div className="storefront-footer-inner">
          <div className="storefront-footer-brand-block">
            <p className="storefront-footer-kicker">Delhi · 40 years in footwear</p>
            <p className="storefront-footer-brand">Shoe Style</p>
            <p className="storefront-footer-copy">Footwear for every version of you, available in sizes {STORE.availableSizes}.</p>
            <Link to="/?view=all" className="storefront-footer-shop">Shop the collection <span aria-hidden="true">→</span></Link>
          </div>

          <nav className="storefront-footer-links" aria-label="Footer navigation">
            <div>
              <p>Explore</p>
              <Link to="/?view=all">Shop all</Link>
              <Link to="/about-us">Our story</Link>
              <Link to="/size-guide">Size guide</Link>
            </div>
            <div>
              <p>Help</p>
              <Link to="/shipping-delivery">Delivery &amp; exchange</Link>
              <Link to="/contact-us">Contact us</Link>
              <Link to="/privacy-policy">Privacy</Link>
            </div>
          </nav>

          <div className="storefront-footer-contact">
            <p>Need a hand?</p>
            <span>We can help with styles, sizing and orders.</span>
            <a href={`https://wa.me/91${STORE.whatsappNumbers[0]}`} target="_blank" rel="noreferrer">Chat on WhatsApp <span aria-hidden="true">↗</span></a>
          </div>

          <div className="storefront-footer-bottom">
            <small>© {new Date().getFullYear()} Shoe Style</small>
            <small>Curated in Delhi · Delivered across India</small>
          </div>
        </div>
      </footer>
      <a className="storefront-support" href={`https://wa.me/91${STORE.whatsappNumbers[0]}`} target="_blank" rel="noreferrer" aria-label="Customer support on WhatsApp"><MessageCircle aria-hidden="true"/><span>Chat</span></a>
    </div>
  );
}

export function Layout() {
  return <CartIconProvider><LayoutContent /></CartIconProvider>;
}
