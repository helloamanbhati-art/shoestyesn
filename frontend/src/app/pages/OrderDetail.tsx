import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, MapPin, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getOrder, type OrderDetails } from '../checkout/paymentApi';
import { useOrders } from '../contexts/OrderContext';
import { usePageTitle } from '../hooks/usePageTitle';

export function OrderDetail() {
  usePageTitle('Order Details');
  const { id = '' } = useParams();
  const { getOrderById } = useOrders();
  const [order, setOrder] = useState<OrderDetails | undefined>(() => getOrderById(id));
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!id) return;
    void getOrder(id).then(setOrder).catch((error) => toast.error(error instanceof Error ? error.message : 'Order not found')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex-1 grid place-items-center p-8"><Loader2 className="size-8 animate-spin" /></div>;
  if (!order) return <div className="flex-1 p-8 text-center"><h1 className="text-2xl mb-4">Order not found</h1><Link to="/my-orders"><Button>Back to orders</Button></Link></div>;

  return <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
    <Link to="/my-orders"><Button variant="ghost"><ArrowLeft className="size-4 mr-2" />Back to orders</Button></Link>
    <Card><CardContent className="p-6 flex flex-col md:flex-row gap-4 md:items-center"><div className="size-14 rounded-full bg-primary/10 grid place-items-center"><Package className="size-7" /></div><div className="flex-1"><h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1><p className="text-muted-foreground">Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p></div><div className="flex gap-2"><Badge>{order.status.replaceAll('_', ' ')}</Badge><Badge variant="outline">Payment: {order.paymentStatus}</Badge></div></CardContent></Card>

    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-4">{order.items.map((item) => <div key={item._id} className="flex gap-4 border-b last:border-0 pb-4 last:pb-0">{item.productImage && <img src={item.productImage} alt="" className="size-20 object-cover rounded" />}<div className="flex-1"><h2 className="font-medium">{item.productName}</h2><p className="text-sm text-muted-foreground">{[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ')}</p>{item.selectedComponents?.length ? <ul className="mt-1 text-sm text-muted-foreground">{item.selectedComponents.map((component) => <li key={component.componentId}>{component.name}: <span className="font-medium text-foreground">{component.size}</span></li>)}</ul> : null}<p className="text-sm">Quantity: {item.quantity}{item.soldBy === 'meter' && item.meters ? ` · ${item.meters} metres` : ''}</p></div><p className="font-medium">₹{item.total.toLocaleString('en-IN')}</p></div>)}</CardContent></Card>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Payment summary</CardTitle></CardHeader><CardContent className="space-y-2"><Row label="Subtotal" value={order.subtotal} /><Row label="Discount" value={-order.discount} /><Row label="Tax" value={order.tax} /><Row label="Shipping" value={order.shippingCost} /><div className="flex justify-between font-semibold text-lg border-t pt-2"><span>Total</span><span>₹{order.total.toLocaleString('en-IN')}</span></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-5" />Delivery address</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p className="font-medium">{order.shippingAddress?.fullName}</p><p>{order.shippingAddress?.addressLine1}</p>{order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}<p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p><p>{order.shippingAddress?.phone}</p></CardContent></Card>
        {(order.trackingNumber || order.carrier) && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="size-5" />Tracking</CardTitle></CardHeader><CardContent><p>{order.carrier || 'Courier assigned'}</p><p className="font-mono text-sm">{order.trackingNumber}</p></CardContent></Card>}
      </div>
    </div>
  </div>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>₹{value.toLocaleString('en-IN')}</span></div>;
}
