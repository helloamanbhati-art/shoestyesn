import { Instagram, Shield } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { CartIconProvider, useCartIcon } from '../contexts/CartIconContext';

function LayoutContent() {
  const { setCartIconElement } = useCartIcon();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar onCartIconReady={setCartIconElement} />
      <main className="flex-1 pt-[82px] md:pt-[112px]"><Outlet /></main>
      <section className="border-y border-white/10 bg-[#0A0A0A] px-4 py-12 text-white md:px-5 md:py-24">
        <div className="mx-auto max-w-[1500px]">
          <p className="luxury-eyebrow text-white">Shoe Style — Not just shoes. A statement.</p>
          <h2 className="bold-display mt-4 text-[clamp(3rem,10vw,10rem)] md:mt-5">STEP <span className="text-white">DIFFERENT.</span></h2>
        </div>
      </section>
      <footer className="bg-[#0A0A0A] px-4 py-10 text-white md:px-8 md:py-20">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-8 border-t border-white/15 pt-9 md:grid-cols-5 md:gap-12 md:pt-14">
            <div className="md:col-span-2">
              <p className="bold-display text-4xl md:text-7xl">SHOE <span className="text-white">STYLE</span></p>
              <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/55 md:mt-5 md:text-sm">Bold footwear for women who make every step their own.</p>
            </div>
            <div>
              <h3 className="footer-heading">Shop</h3>
              <div className="footer-links"><Link to="/#latest-drops">New Arrivals</Link><Link to="/category/Heels">Heels</Link><Link to="/category/Sandals">Sandals</Link><Link to="/category/Boots">Boots</Link></div>
            </div>
            <div>
              <h3 className="footer-heading">Help</h3>
              <div className="footer-links"><Link to="/contact-us">Contact</Link><Link to="/shipping-delivery">Shipping</Link><Link to="/shipping-delivery">Returns</Link><Link to="/size-guide">FAQs &amp; Size Guide</Link><Link to="/my-orders">Track Order</Link></div>
            </div>
            <div>
              <h3 className="footer-heading">Newsletter</h3>
              <p className="text-xs leading-5 text-white/55 md:text-sm md:leading-6">Signup will activate when the newsletter provider is configured.</p>
              <h3 className="footer-heading mt-7">Social</h3>
              <div className="footer-links"><a href="https://www.instagram.com/shoe.stylesn/" target="_blank" rel="noreferrer" className="flex items-center gap-2"><Instagram size={16} /> Instagram</a><a href="https://wa.me/917982558322" target="_blank" rel="noreferrer">WhatsApp</a><Link to="/privacy-policy">Privacy Policy</Link><Link to="/about-us">Terms &amp; Conditions</Link></div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-5 text-[9px] uppercase tracking-[0.16em] text-white/40 md:mt-14 md:flex-row md:items-center md:justify-between md:pt-6 md:text-[10px]">
            <p>© {new Date().getFullYear()} Shoe Style. All rights reserved.</p>
            <a href={import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174/admin/login'} className="flex items-center gap-1"><Shield size={12} /> Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Layout() {
  return <CartIconProvider><LayoutContent /></CartIconProvider>;
}
