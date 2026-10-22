import { ChevronDown, LogIn, LogOut, Menu, Package, ShoppingCart, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { maskPhone } from '../auth/phone';
import { ShoeStyleLogo } from './ShoeStyleLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NavbarProps {
  onCartIconReady?: (element: HTMLElement) => void;
}

export function Navbar({ onCartIconReady }: NavbarProps) {
  const { totalItems } = useCart();
  const cartButtonRef = useRef<HTMLDivElement>(null);
  const [previousTotal, setPreviousTotal] = useState(totalItems);
  const [bounce, setBounce] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pathname } = useLocation();
  const { customer, status, isAuthenticated, openLogin, logout } = useAuth();

  useEffect(() => {
    if (cartButtonRef.current && onCartIconReady) onCartIconReady(cartButtonRef.current);
  }, [onCartIconReady]);

  useEffect(() => {
    if (totalItems > previousTotal) {
      setBounce(true);
      const timer = window.setTimeout(() => setBounce(false), 600);
      setPreviousTotal(totalItems);
      return () => window.clearTimeout(timer);
    }
    setPreviousTotal(totalItems);
  }, [previousTotal, totalItems]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('You are signed out.');
    } catch {
      toast.error('We could not sign you out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
      <div className="flex h-[72px] w-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-80" aria-label="Shoe Style home">
            <ShoeStyleLogo className="h-10 w-auto text-foreground md:h-12" />
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {status === 'loading' ? (
            <Button variant="ghost" size="sm" disabled aria-label="Checking sign-in status">
              <UserRound className="size-4" />
              <span className="hidden md:inline">Account</span>
            </Button>
          ) : isAuthenticated && customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" aria-label="Open account menu">
                  <UserRound className="size-4" />
                  <span className="hidden md:inline">{customer.firstName || customer.email || (customer.phone ? maskPhone(customer.phone) : 'Account')}</span>
                  <ChevronDown className="hidden size-3.5 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block">Signed in</span>
                  <span className="block text-xs font-normal text-muted-foreground">{customer.email || (customer.phone ? maskPhone(customer.phone) : 'Clerk account')}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={isLoggingOut} onSelect={() => void handleLogout()}>
                  <LogOut className="size-4" />
                  {isLoggingOut ? 'Signing out…' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={openLogin} aria-label="Sign in">
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
          <Link to="/my-orders" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-2"><Package className="size-4" /><span>My Orders</span></Button>
          </Link>
          <Link to="/cart" aria-label={`Cart with ${totalItems} items`}>
            <motion.div animate={bounce ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4 }}>
              <div ref={cartButtonRef}>
                <Button variant="outline" size="icon" className="relative" aria-label={`Cart with ${totalItems} items`}>
                  <ShoppingCart className="size-5" />
                  {totalItems > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{totalItems > 99 ? '99+' : totalItems}</motion.span>}
                </Button>
              </div>
            </motion.div>
          </Link>
          {pathname === '/' && (
            <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => window.dispatchEvent(new Event('toggle-filters'))} aria-label="Open navigation and filters">
              <Menu className="size-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
