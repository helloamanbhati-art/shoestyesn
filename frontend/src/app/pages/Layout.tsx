import { Outlet, Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { CartIconProvider, useCartIcon } from '../contexts/CartIconContext';
import { Shield } from 'lucide-react';

function LayoutContent() {
  const { setCartIconElement } = useCartIcon();

  return (
    <div className="min-h-screen bg-background flex flex-col">
          <Navbar 
            onCartIconReady={setCartIconElement}
          />
          <main className="flex-1 pt-[73px]">
            <Outlet />
          </main>
          
          {/* Footer with Admin Link and Privacy Policy */}
          <footer className="border-t bg-muted/30 py-6 px-4 text-center">
            <div className="max-w-7xl mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                © {new Date().getFullYear()} Shoe Style. All rights reserved.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                <Link
                  to="/privacy-policy"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Privacy Policy
                </Link>
                <a
                  href={import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174/admin/login'}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Shield className="size-3" />
                  Admin Access
                </a>
              </div>
            </div>
          </footer>
    </div>
  );
}

export function Layout() {
  return (
    <CartIconProvider>
      <LayoutContent />
    </CartIconProvider>
  );
}
