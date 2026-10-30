import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, Package } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getOrder, type OrderDetails } from '../checkout/paymentApi';
import { usePageTitle } from '../hooks/usePageTitle';

export function OrderSuccess() {
  usePageTitle('Order Success');
  const [params] = useSearchParams();
  const location = useLocation();
  const stateOrderId = (location.state as { orderId?: string } | null)?.orderId;
  const orderId = params.get('orderId') || stateOrderId || '';
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order reference is missing.');
      return;
    }
    void getOrder(orderId).then(setOrder).catch((cause) => setError(cause instanceof Error ? cause.message : 'Order could not be loaded'));
  }, [orderId]);

  useEffect(() => {
    if (!order || order.paymentStatus !== 'paid') return;
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
  }, [order]);

  if (error) return <div className="flex-1 p-8 text-center"><h1 className="text-xl mb-4">{error}</h1><Button asChild><Link to="/my-orders">View my orders</Link></Button></div>;
  if (!order) return <div className="flex-1 grid place-items-center p-8"><Loader2 className="size-8 animate-spin" /></div>;

  return <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto space-y-6">
    <Card className="border-black/20 bg-neutral-50"><CardContent className="p-8 text-center"><CheckCircle2 className="size-16 text-black mx-auto mb-4" /><h1 className="text-3xl font-semibold mb-2">Payment complete</h1><p className="text-muted-foreground">Order {order.orderNumber} is confirmed and visible in your account.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Order summary</CardTitle></CardHeader><CardContent className="space-y-4">{order.items.map((item) => <div key={item._id} className="flex items-center gap-3"><div className="size-10 bg-muted rounded grid place-items-center"><Package className="size-5" /></div><div className="flex-1"><p className="font-medium">{item.productName}</p><p className="text-sm text-muted-foreground">Quantity {item.quantity}</p></div><p>₹{item.total.toLocaleString('en-IN')}</p></div>)}<div className="flex justify-between text-lg font-semibold border-t pt-4"><span>Total paid</span><span>₹{order.total.toLocaleString('en-IN')}</span></div></CardContent></Card>
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Button asChild size="lg" className="w-full sm:w-auto"><Link to={`/order/${order._id}`}>View your order</Link></Button>
      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto"><Link to="/">Continue shopping</Link></Button>
    </div>
  </div>;
}
