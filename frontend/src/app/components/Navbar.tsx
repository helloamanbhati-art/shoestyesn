import { ChevronDown, Heart, LogOut, Menu, Package, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { maskPhone } from '../auth/phone';
import { Button } from './ui/button';
import { ShoeStyleLogo } from './ShoeStyleLogo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { apiRequest } from '../api/client';

interface NavbarProps { onCartIconReady?: (element: HTMLElement) => void; }

const links = [
  { label: 'New Arrivals', href: '/#shop' },
  { label: 'Heels', href: '/?category=Heels#shop' },
  { label: 'Sandals', href: '/?category=Sandals#shop' },
  { label: 'Boots', href: '/?category=Boots#shop' },
  { label: 'Pumps', href: '/?category=Pumps#shop' },
  { label: 'Trending', href: '/#shop' },
  { label: 'Best Sellers', href: '/#shop' },
  { label: 'Sale', href: '/?sale=true#shop', accent: true },
  { label: 'Track Order', href: '/my-orders' },
  { label: 'Size Guide', href: '/size-guide' },
];

export function Navbar({ onCartIconReady }: NavbarProps) {
  const { totalItems } = useCart();
  const { pathname } = useLocation();
  const { customer, status, isAuthenticated, openLogin, logout } = useAuth();
  const cartButtonRef = useRef<HTMLDivElement>(null);
  const [previousTotal, setPreviousTotal] = useState(totalItems);
  const [bounce, setBounce] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ announcementText: string | null }>('/api/v1/catalog/storefront-settings')
      .then((settings) => setAnnouncement(settings.announcementText))
      .catch(() => setAnnouncement(null));
  }, []);

  useEffect(() => { if (cartButtonRef.current && onCartIconReady) onCartIconReady(cartButtonRef.current); }, [onCartIconReady]);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => { if (totalItems > previousTotal) { setBounce(true); const timer = window.setTimeout(() => setBounce(false), 600); setPreviousTotal(totalItems); return () => window.clearTimeout(timer); } setPreviousTotal(totalItems); }, [previousTotal, totalItems]);
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, [menuOpen, searchOpen]);

  const handleLogout = async () => { setIsLoggingOut(true); try { await logout(); toast.success('You are signed out.'); } catch { toast.error('We could not sign you out. Please try again.'); } finally { setIsLoggingOut(false); } };

  return <header className="fixed inset-x-0 top-0 z-50 bg-white text-black">
    <div className="h-6 overflow-hidden bg-[#0A0A0A] text-[8px] font-bold uppercase tracking-[0.18em] text-white md:h-8 md:text-[9px] md:tracking-[0.22em]"><div className="flex h-full items-center justify-center px-4 text-center"><span>{announcement || 'Shoe Style · Not just shoes. A statement.'}</span></div></div>
    <div className="border-b border-black/15 bg-white/95 backdrop-blur-md">
      <div className="mx-auto grid h-[58px] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-2 md:h-[82px] md:px-8">
        <button type="button" className="nav-icon justify-self-start" onClick={() => { setMenuOpen(v => !v); setSearchOpen(false); }} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu">{menuOpen ? <X size={21}/> : <Menu size={22} strokeWidth={2.4}/>}</button>
        <Link to="/" className="flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4" aria-label="Shoe Style home">
          <ShoeStyleLogo className="h-8 w-auto max-w-[6.75rem] object-contain min-[390px]:max-w-[7.5rem] md:h-14 md:max-w-[12rem]" alt="" />
        </Link>
        <nav className="hidden" aria-label="Main navigation">{links.map(link => <Link key={link.label} to={link.href}>{link.label}</Link>)}</nav>
        <div className="flex items-center justify-self-end md:gap-2">
          <button onClick={() => { setSearchOpen(v => !v); setMenuOpen(false); }} className="nav-icon !hidden sm:!grid" aria-label="Search" aria-expanded={searchOpen} aria-controls="site-search-panel"><Search size={20}/></button>
          <Link to="/my-orders" className="nav-icon !hidden lg:!grid" aria-label="My orders"><Package size={21}/></Link>
          <Link to="/wishlist" className="nav-icon !hidden sm:!grid" aria-label="Wishlist"><Heart size={20}/><span className="sr-only">Wishlist</span></Link>
          {status === 'loading' ? <span className="nav-icon"><UserRound size={20}/></span> : isAuthenticated && customer ? <DropdownMenu><DropdownMenuTrigger asChild><button className="nav-icon" aria-label="Open account menu"><UserRound size={20}/><ChevronDown className="hidden"/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel><span className="block">Signed in</span><span className="block text-xs font-normal text-muted-foreground">{customer.email || (customer.phone ? maskPhone(customer.phone) : 'Account')}</span></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem variant="destructive" disabled={isLoggingOut} onSelect={() => void handleLogout()}><LogOut className="size-4"/>{isLoggingOut ? 'Signing out…' : 'Sign out'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <button type="button" className="nav-icon" onClick={openLogin} aria-label="Sign in"><UserRound size={20}/></button>}
          <Link to="/cart" aria-label={`Cart with ${totalItems} items`}><motion.div animate={bounce ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4 }}><div ref={cartButtonRef} className="nav-icon relative"><ShoppingBag size={21}/>{totalItems > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-black text-[9px] font-bold text-white">{totalItems > 99 ? '99+' : totalItems}</span>}</div></motion.div></Link>
          {pathname === '/' && <Button type="button" variant="ghost" size="icon" className="hidden" onClick={() => window.dispatchEvent(new Event('toggle-filters'))} aria-label="Open navigation and filters"><Menu/></Button>}
        </div>
      </div>
    </div>
    {searchOpen && <form id="site-search-panel" action="/" className="absolute inset-x-0 top-full flex border-b border-black bg-white px-5 py-4"><label htmlFor="site-search" className="sr-only">Search products</label><input id="site-search" name="search" autoFocus placeholder="SEARCH FOR SHOES…" className="mx-auto w-full max-w-4xl border-b border-black bg-transparent py-2 text-sm font-bold outline-none"/></form>}
    {menuOpen && <><button type="button" className="fixed inset-x-0 bottom-0 top-[82px] bg-black/45 md:top-[112px]" onClick={() => setMenuOpen(false)} aria-label="Close menu"/><nav id="mobile-menu" className="absolute left-0 top-full w-full border-b border-black bg-white px-5 pb-7 pt-2 shadow-xl md:w-[26rem]" aria-label="Mobile navigation">{links.map(link => <Link key={link.label} to={link.href} className={`flex min-h-12 items-center justify-between border-b border-black/15 py-3 text-xl font-black uppercase md:min-h-14 md:text-2xl ${link.accent ? 'underline decoration-2 underline-offset-4' : ''}`}>{link.label}<span aria-hidden="true">↗</span></Link>)}</nav></>}
  </header>;
}
