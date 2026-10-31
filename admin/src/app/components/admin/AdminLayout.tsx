import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { BarChart3, ChevronDown, ChevronRight, CircleUserRound, Footprints, Layers3, LogOut, Menu, Package, Settings, ShoppingBag, Users, X } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { cn } from '../ui/utils';
import shoeFashionLogo from '../../../../public/shoe-style-logo.png?url';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const primaryItems = [{ icon: BarChart3, label: 'Analytics', path: '/admin/analytics' }];
const commerceItems = [
  { icon: ShoppingBag, label: 'Orders', path: '/admin/orders', count: 'orders' }, { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Footprints, label: 'Footwear Types', path: '/admin/footwear-types' }, { icon: Layers3, label: 'Categories', path: '/admin/categories' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: Settings, label: 'Storefront', path: '/admin/storefront-settings' },
];
const pageTitles: Record<string, string> = {
  '/admin': 'Add product', '/admin/analytics': 'Analytics', '/admin/orders': 'Order list', '/admin/products': 'Products',
  '/admin/footwear-types': 'Footwear types', '/admin/categories': 'Categories',
  '/admin/customers': 'Customers',
  '/admin/storefront-settings': 'Storefront settings',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commerceOpen, setCommerceOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();
  const { orders } = useOrders();
  const { admin, logout } = useAdminAuth();
  useEffect(() => setSidebarOpen(false), [location.pathname]);
  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  const fullName = [admin?.firstName, admin?.lastName].filter(Boolean).join(' ') || 'Administrator';
  const role = admin?.role?.replace(/_/g, ' ') || 'Store manager';
  const initials = `${admin?.firstName?.[0] || 'A'}${admin?.lastName?.[0] || ''}`.toUpperCase();
  const pendingOrders = orders.filter((order) => [0, 1, 'pending', 'confirmed', 'processing'].includes(order.status as never)).length;
  const isActive = (path: string, exact?: boolean) => exact ? location.pathname === path : location.pathname.startsWith(path);
  const handleLogout = async () => { await logout(); navigate('/admin/login', { replace: true }); };

  const navLink = (item: (typeof commerceItems)[number] | (typeof primaryItems)[number]) => {
    const Icon = item.icon; const active = isActive(item.path, 'exact' in item && item.exact);
    const count = 'count' in item && item.count === 'orders' ? pendingOrders : 0;
    return <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={cn('admin-nav-link', active && 'admin-nav-link-active')}>
      <Icon aria-hidden="true" /><span>{item.label}</span>{count > 0 && <span className="admin-nav-count">{count}</span>}
    </Link>;
  };

  return <div className="admin-shell min-h-screen bg-[#f7f7f6] text-[#191919]">
    <header className="admin-mobile-header"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu /></button><img className="admin-mobile-logo" src={shoeFashionLogo} alt="Jai Mata Di Shoe Style" /><span aria-hidden="true" className="w-9" /></header>
    <aside className={cn('admin-sidebar', sidebarOpen && 'admin-sidebar-open')}>
      <div className="admin-brand-row"><Link to="/admin" className="admin-brand" aria-label="Jai Mata Di Shoe Style admin home"><img className="admin-brand-logo" src={shoeFashionLogo} alt="Jai Mata Di Shoe Style" /><span><strong>Shoe Fashion</strong><small>Footwear admin</small></span></Link><button className="admin-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X /></button></div>
      <div className="admin-profile">{admin.avatar ? <img src={admin.avatar} alt="" /> : <span>{initials}</span>}<div className="min-w-0"><strong className="truncate">{fullName}</strong><small className="capitalize">{role}</small></div><span className="admin-online" title="Online" /></div>
      <nav aria-label="Admin navigation" className="admin-nav"><p className="admin-nav-label">Overview</p>{primaryItems.map(navLink)}<button type="button" className="admin-nav-group" onClick={() => setCommerceOpen((open) => !open)} aria-expanded={commerceOpen}><span>Store management</span>{commerceOpen ? <ChevronDown /> : <ChevronRight />}</button>{commerceOpen && <div className="admin-nav-subtree">{commerceItems.map(navLink)}</div>}</nav>
      <div className="admin-sidebar-footer"><button type="button" className="admin-logout" onClick={handleLogout}><LogOut aria-hidden="true" /><span>Sign out</span></button></div>
    </aside>
    {sidebarOpen && <button className="admin-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <main className="admin-main"><div className="admin-pagebar"><div><p>Shoe Fashion</p><h2>{pageTitles[location.pathname] || 'Admin'}</h2></div><div className="admin-page-account"><CircleUserRound aria-hidden="true" /><span>{fullName}</span></div></div>{!isOnline && <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950" role="status" aria-live="polite">You are offline. Keep this page open—data will reconnect automatically when your network returns.</div>}<div className="admin-content"><Outlet /></div></main>
  </div>;
}
