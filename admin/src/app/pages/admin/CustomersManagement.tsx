import { useMemo, useState } from 'react';
import { ArrowUpRight, IndianRupee, MapPin, Package, Search, TrendingUp, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { useOrders } from '../../contexts/OrderContext';

interface DerivedCustomer { id: string; name: string; phone: string; email?: string; city: string; state: string; totalOrders: number; totalSpent: number; lastOrderDate: string; }

const statusConfig = {
  0: { label: 'Order Placed', color: 'bg-amber-100 text-amber-800' }, 1: { label: 'Processing', color: 'bg-blue-100 text-blue-800' }, 2: { label: 'Shipped', color: 'bg-violet-100 text-violet-800' }, 3: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' }, 4: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' }, confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' }, processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' }, shipped: { label: 'Shipped', color: 'bg-violet-100 text-violet-800' }, out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' }, delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' }, cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }, refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};
const avatarColors = ['bg-rose-100 text-rose-800', 'bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-800'];
const getCustomerOrderNumber = (order: any) => order.orderNumber || (order.id ? `HC-2024-${String(order.id).padStart(6, '0')}` : 'N/A');

export function CustomersManagement() {
  const { orders } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<DerivedCustomer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const customers = useMemo(() => {
    const customerMap = new Map<string, DerivedCustomer>();
    const parseAddress = (address: any) => {
      if (!address) return { city: 'Unknown', state: 'Unknown' };
      if (typeof address === 'string') { const parts = address.split(',').map((part) => part.trim()).filter(Boolean); return { city: parts.at(-3) || 'Unknown', state: parts.at(-2) || 'Unknown' }; }
      return { city: address.city || address.addressLine1 || 'Unknown', state: address.state || 'Unknown' };
    };
    orders.forEach((order) => {
      const customerKey = order.customerPhone || order.customerEmail || order.customerName || 'unknown';
      if (!customerMap.has(customerKey)) {
        const { city, state } = parseAddress(order.shippingAddress);
        customerMap.set(customerKey, { id: customerKey, name: order.customerName || 'Guest customer', phone: order.customerPhone || 'Not provided', email: order.customerEmail, city, state, totalOrders: 1, totalSpent: order.total, lastOrderDate: order.createdAt });
      } else {
        const customer = customerMap.get(customerKey)!;
        customer.totalOrders += 1; customer.totalSpent += order.total;
        if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) customer.lastOrderDate = order.createdAt;
      }
    });
    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value?.toLowerCase().includes(normalizedQuery)));
  const totalCustomers = customers.length;
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeThisMonth = customers.filter((customer) => new Date(customer.lastOrderDate) >= thirtyDaysAgo).length;
  const avgOrdersPerCustomer = totalCustomers ? (orders.length / totalCustomers).toFixed(1) : '0.0';
  const avgCustomerValue = totalCustomers ? Math.round(orders.reduce((sum, order) => sum + order.total, 0) / totalCustomers) : 0;
  const getCustomerOrders = (customer: DerivedCustomer) => orders.filter((order) => (order.customerPhone || order.customerEmail || order.customerName || 'unknown') === customer.id);
  const handleViewOrders = (customer: DerivedCustomer) => { setSelectedCustomer(customer); setDialogOpen(true); };
  const getRelativeTime = (dateString: string) => { const days = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000)); if (!days) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days} days ago`; if (days < 30) return `${Math.floor(days / 7)} weeks ago`; if (days < 365) return `${Math.floor(days / 30)} months ago`; return `${Math.floor(days / 365)} years ago`; };
  const getAvatarColor = (customer: DerivedCustomer) => avatarColors[[...customer.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];
  const metrics = [
    { label: 'Total customers', value: totalCustomers, icon: Users, accent: 'bg-slate-100 text-slate-700' },
    { label: 'Active in 30 days', value: activeThisMonth, icon: TrendingUp, accent: 'bg-emerald-100 text-emerald-700' },
    { label: 'Orders per customer', value: avgOrdersPerCustomer, icon: Package, accent: 'bg-sky-100 text-sky-700' },
    { label: 'Average value', value: `₹${avgCustomerValue.toLocaleString('en-IN')}`, icon: IndianRupee, accent: 'bg-amber-100 text-amber-800' },
  ];
  const emptyTitle = searchQuery ? `No customers match “${searchQuery}”` : 'No customers yet';

  return <div className="customers-management space-y-5 md:space-y-6">
    <header className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Customer directory</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Customers</h1><p className="mt-1 text-sm text-gray-500">All-time customer overview</p></div><p className="hidden text-sm text-gray-500 sm:block">{totalCustomers} {totalCustomers === 1 ? 'customer' : 'customers'}</p></header>

    <section aria-label="Customer summary" className="grid grid-cols-2 overflow-hidden border border-gray-200 bg-white lg:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, accent }, index) => <article key={label} className={`min-w-0 p-4 md:p-5 ${index % 2 ? '' : 'border-r'} ${index > 1 ? 'border-t lg:border-t-0' : ''} ${index === 1 ? 'lg:border-r' : ''} border-gray-200`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-medium leading-4 text-gray-500 md:text-sm">{label}</p><p className="mt-2 truncate text-xl font-bold tracking-tight text-gray-950 md:text-2xl">{value}</p></div><span className={`grid size-8 shrink-0 place-items-center rounded-full ${accent}`}><Icon aria-hidden="true" className="size-4" /></span></div></article>)}
    </section>

    <section aria-labelledby="customer-list-heading" className="overflow-hidden border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4 md:flex md:items-center md:justify-between md:gap-6 md:px-5"><div className="mb-3 md:mb-0"><h2 id="customer-list-heading" className="font-bold text-gray-950">Customer list</h2><p className="mt-0.5 text-xs text-gray-500" aria-live="polite">Showing {filteredCustomers.length} of {totalCustomers}</p></div><div className="relative md:w-80"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><Input type="search" aria-label="Search customers" placeholder="Search name, phone, or email" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-10 bg-gray-50 pl-10" /></div></div>
      {filteredCustomers.length === 0 ? <div className="flex flex-col items-center justify-center px-6 py-14 text-center" role="status"><span className="grid size-12 place-items-center rounded-full bg-gray-100"><Users aria-hidden="true" className="size-5 text-gray-500" /></span><h3 className="mt-4 font-bold text-gray-950">{emptyTitle}</h3><p className="mt-1 max-w-sm text-sm text-gray-500">{searchQuery ? 'Try a name, phone number, or email address.' : 'Customers will appear after their first order.'}</p></div> : <>
        <div className="divide-y divide-gray-200 md:hidden">{filteredCustomers.map((customer) => <article key={customer.id} className="p-4"><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${getAvatarColor(customer)}`}>{customer.name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-bold text-gray-950">{customer.name}</h3><p className="truncate text-xs text-gray-500">{customer.phone}</p></div><p className="shrink-0 font-bold text-gray-950">₹{customer.totalSpent.toLocaleString('en-IN')}</p></div><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500"><span>{customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'}</span><span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3" />{customer.city}</span><span>{getRelativeTime(customer.lastOrderDate)}</span></div><Button variant="outline" size="sm" className="mt-3 w-full justify-between" aria-label={`View orders for ${customer.name}`} onClick={() => handleViewOrders(customer)}>View orders <ArrowUpRight aria-hidden="true" className="size-4" /></Button></div></div></article>)}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[860px]"><thead><tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="px-5 py-3">Customer</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Total spent</th><th className="px-4 py-3">Last order</th><th className="px-5 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-gray-100">{filteredCustomers.map((customer) => <tr key={customer.id} className="transition-colors hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${getAvatarColor(customer)}`}>{customer.name.charAt(0).toUpperCase()}</span><div><p className="font-semibold text-gray-950">{customer.name}</p><p className="text-xs text-gray-500">{customer.email || customer.phone}</p></div></div></td><td className="px-4 py-4"><p className="text-sm text-gray-800">{customer.city}</p><p className="text-xs text-gray-500">{customer.state}</p></td><td className="px-4 py-4"><Badge variant="secondary">{customer.totalOrders}</Badge></td><td className="px-4 py-4 font-semibold text-gray-950">₹{customer.totalSpent.toLocaleString('en-IN')}</td><td className="px-4 py-4 text-sm text-gray-500">{getRelativeTime(customer.lastOrderDate)}</td><td className="px-5 py-4 text-right"><Button variant="outline" size="sm" aria-label={`View orders for ${customer.name}`} onClick={() => handleViewOrders(customer)}>View orders</Button></td></tr>)}</tbody></table></div>
      </>}
    </section>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">{selectedCustomer && <><DialogHeader><DialogTitle><span className="block text-xl">{selectedCustomer.name}</span><span className="mt-1 block text-sm font-normal text-gray-500">{selectedCustomer.phone}</span></DialogTitle></DialogHeader><div className="py-4"><h3 className="mb-4 font-semibold">Order history</h3><div className="space-y-3">{getCustomerOrders(selectedCustomer).map((order) => { const status = statusConfig[order.status as keyof typeof statusConfig] || { label: String(order.status), color: 'bg-gray-100 text-gray-800' }; return <div key={order.id || order._id} className="flex flex-col gap-3 border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-medium">{getCustomerOrderNumber(order)}</span><Badge className={status.color}>{status.label}</Badge></div><p className="mt-1 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {order.items.length} items</p></div><p className="text-lg font-bold">₹{order.total.toLocaleString('en-IN')}</p></div>; })}</div></div></>}</DialogContent></Dialog>
  </div>;
}
