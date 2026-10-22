import { useEffect } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Loader2, Package, ShoppingBag, Truck } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

const statusLabels: Record<string, string> = {
  pending: 'Payment pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
};

export function MyOrders() {
  usePageTitle('My Orders');
  const { orders, loading, error, refreshOrders } = useOrders();
  const { isAuthenticated, openLogin } = useAuth();

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">My Orders</h1>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground">{isAuthenticated ? 'Live order and payment data from your account.' : 'Guest orders saved in this browser.'}</p>
        {!isAuthenticated && <Button type="button" variant="outline" onClick={openLogin}>Sign in for orders on every device</Button>}
      </div>
      {loading && <div className="py-16 grid place-items-center"><Loader2 className="size-8 animate-spin" aria-label="Loading orders" /></div>}
      {error && <Card className="border-destructive"><CardContent className="p-5 text-destructive">{error}</CardContent></Card>}
      {!loading && !error && orders.length === 0 && <Card><CardContent className="py-12 text-center"><ShoppingBag className="size-14 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl mb-2">No orders yet</h2>{!isAuthenticated && <p className="mb-4 text-sm text-muted-foreground">Orders placed as a guest on this device will appear here.</p>}<Link to="/"><Button>Start shopping</Button></Link></CardContent></Card>}
      <div className="grid gap-4">
        {orders.map((order) => <Link key={order._id} to={`/order/${order._id}`}>
          <Card className="transition-shadow hover:shadow-md"><CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="size-12 rounded-full bg-muted grid place-items-center">{order.status === 'delivered' ? <CheckCircle2 className="size-6 text-green-600" /> : order.status === 'shipped' ? <Truck className="size-6" /> : <Package className="size-6" />}</div>
            <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{order.orderNumber}</h2><Badge variant="secondary">{statusLabels[order.status] || order.status}</Badge><Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}>{order.paymentStatus}</Badge></div><p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.items.length} item{order.items.length === 1 ? '' : 's'}</p></div>
            <p className="text-xl font-semibold">₹{order.total.toLocaleString('en-IN')}</p>
          </CardContent></Card>
        </Link>)}
      </div>
    </div>
  );
}
