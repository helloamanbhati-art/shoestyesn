import { LogOut, Menu, PackageSearch, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useProductContext } from '../contexts/ProductContext';
import { ShoeStyleLogo } from './ShoeStyleLogo';

interface NavbarProps { onCartIconReady?: (element: HTMLElement) => void; }

const fixedLinks = [
  { label: 'Shop', href: '/#new-arrivals-title' },
  { label: 'Sale', href: '/?sale=true', accent: true },
  { label: 'Stores', href: '/contact-us' },
  { label: 'Our Story', href: '/about-us' },
  { label: 'Return & Exchange', href: '/shipping-delivery' },
  { label: 'News', href: '/#new-arrivals-title' },
  { label: 'Size Guide', href: '/size-guide' },
];

export function Navbar({ onCartIconReady }: NavbarProps) {
  const { totalItems } = useCart();
  const { categories } = useProductContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, status, isAuthenticated, openLogin, logout } = useAuth();
  const cartButtonRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 72);
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const dynamicLinks = categories.slice(0, 5).map((category) => ({ label: category, href: `/category/${encodeURIComponent(category)}` }));
  const mobileLinks = dynamicLinks.length ? [fixedLinks[0], ...dynamicLinks, ...fixedLinks.slice(1)] : fixedLinks;

  useEffect(() => { if (cartButtonRef.current && onCartIconReady) onCartIconReady(cartButtonRef.current); }, [onCartIconReady]);
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 72);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);
  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);
  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setAccountOpen(false); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen, accountOpen]);

  const handleLogout = async () => {
    try { await logout(); setAccountOpen(false); toast.success('You are signed out.'); }
    catch { toast.error('We could not sign you out. Please try again.'); }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchQuery.trim();
    navigate(term ? `/?search=${encodeURIComponent(term)}` : '/');
  };

  return <header className={`storefront-header ${isScrolled ? 'is-searching' : ''}`}>
    <div className="storefront-accent"/>
    <div className="storefront-brand-row">
      <button type="button" className="storefront-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu">{menuOpen ? <X/> : <Menu/>}</button>
      <Link to="/" className="storefront-logo" aria-label="Jai Mata Di Shoe Style home"><ShoeStyleLogo/></Link>
      <nav className="storefront-nav" aria-label="Main navigation">{fixedLinks.map((link) => <Link key={link.label} to={link.href} className={link.accent ? 'is-accent' : ''}>{link.label}</Link>)}</nav>
      <form className="storefront-header-search-inline" role="search" onSubmit={submitSearch}>
        <label htmlFor="header-product-search-inline" className="sr-only">Search products</label>
        <Search aria-hidden="true" size={18}/>
        <input id="header-product-search-inline" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" aria-label="Search products" autoComplete="off" maxLength={100}/>
        <button type="submit" className="storefront-search-submit">Search</button>
      </form>
      <div className="storefront-actions">
        <Link to="/my-orders" className="storefront-icon" aria-label="View your orders"><PackageSearch/></Link>
        {status === 'loading' ? <span className="storefront-icon"><UserRound/></span> : isAuthenticated && customer ? <div className="relative"><button type="button" className="storefront-icon" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}><UserRound/></button>{accountOpen && <div className="storefront-account-menu"><span>{customer.email || customer.phone || 'Your account'}</span><button type="button" onClick={() => void handleLogout()}><LogOut size={15}/> Sign out</button></div>}</div> : <button type="button" className="storefront-icon" onClick={openLogin} aria-label="Sign in"><UserRound/></button>}
        <Link to="/cart" className="storefront-icon" aria-label={`Shopping bag with ${totalItems} items`}><div ref={cartButtonRef} className="relative"><ShoppingBag/>{totalItems > 0 && <span className="storefront-count">{totalItems > 99 ? '99+' : totalItems}</span>}</div></Link>
      </div>
    </div>
    <form className="storefront-header-search" role="search" onSubmit={submitSearch}>
      <label htmlFor="header-product-search-mobile" className="sr-only">Search products</label>
      <div className="storefront-header-search-field">
        <Search aria-hidden="true" size={22}/>
        <input id="header-product-search-mobile" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder='Search for "Block Heels"' aria-label="Search products" autoComplete="off" maxLength={100}/>
      </div>
      <button type="submit" className="storefront-search-submit">Search</button>
    </form>
    {menuOpen && <><button type="button" className="storefront-menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu"/><nav id="mobile-menu" className="storefront-mobile-menu" aria-label="Mobile navigation">{mobileLinks.map((link) => <Link key={link.label} to={link.href} className={link.accent ? 'is-accent' : ''}>{link.label}<span aria-hidden="true">↗</span></Link>)}</nav></>}
  </header>;
}
