import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { getOrder, getPaymentConfig, reportPaymentFailure, verifyPayment, type OrderDetails } from '../checkout/paymentApi';
import { useCart } from '../contexts/CartContext';
import { usePageTitle } from '../hooks/usePageTitle';

declare global {
  interface Window { Razorpay: new (options: Record<string, unknown>) => RazorpayInstance }
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailure) => void) => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: {
    description?: string;
    metadata?: { order_id?: string };
  };
}

const ENV_RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
const ENV_MOCK_MODE = import.meta.env.DEV && import.meta.env.VITE_RAZORPAY_MOCK_MODE === 'true';

export function Payment() {
  usePageTitle('Payment');
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentKey, setPaymentKey] = useState(ENV_RAZORPAY_KEY);
  const [mockMode, setMockMode] = useState(ENV_MOCK_MODE);
  const [configReady, setConfigReady] = useState(false);
  const [scriptReady, setScriptReady] = useState(ENV_MOCK_MODE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOpened = useRef(false);
  const pollingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No checkout order was provided.');
      return;
    }
    void Promise.all([getOrder(orderId), getPaymentConfig()])
      .then(([loadedOrder, config]) => {
        setOrder(loadedOrder);
        setPaymentKey(config.keyId || ENV_RAZORPAY_KEY);
        setMockMode(config.mockMode || ENV_MOCK_MODE);
        if (config.mockMode || ENV_MOCK_MODE) setScriptReady(true);
        setConfigReady(true);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Payment could not be loaded');
      });
  }, [orderId]);

  useEffect(() => {
    if (!configReady) return;
    if (mockMode) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) {
      if (window.Razorpay) setScriptReady(true);
      else existing.addEventListener('load', () => setScriptReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('The payment gateway could not be loaded.');
    document.body.appendChild(script);
  }, [configReady, mockMode]);

  useEffect(() => () => {
    if (pollingTimer.current) window.clearTimeout(pollingTimer.current);
  }, []);

  const finish = useCallback((paidOrder: OrderDetails, paymentId?: string) => {
    toast.success('Payment successful. Your order is confirmed.');
    navigate(`/order-success?orderId=${encodeURIComponent(paidOrder._id)}`, {
      replace: true,
      state: {
        items: paidOrder.items,
        totalPrice: paidOrder.total,
        paymentMethod: 'razorpay',
        orderId: paidOrder._id,
        orderNumber: paidOrder.orderNumber,
        paymentId: paymentId || paidOrder.paymentDetails?.razorpayPaymentId,
        status: paidOrder.status,
        shippingCost: paidOrder.shippingCost,
        subtotal: paidOrder.subtotal,
      },
    });
    void refreshCart().catch(() => undefined);
  }, [navigate, refreshCart]);

  const poll = useCallback((attempt = 0) => {
    if (!orderId || attempt >= 20) {
      setIsPolling(false);
      toast.info('Payment confirmation is taking longer than expected. You can safely check your order again.');
      return;
    }
    setIsPolling(true);
    void getOrder(orderId).then((latest) => {
      setOrder(latest);
      if (latest.paymentStatus === 'paid') {
        setIsPolling(false);
        void finish(latest);
        return;
      }
      pollingTimer.current = window.setTimeout(() => poll(attempt + 1), 3000);
    }).catch(() => {
      pollingTimer.current = window.setTimeout(() => poll(attempt + 1), 3000);
    });
  }, [finish, orderId]);

  const handleVerifiedPayment = useCallback(async (response: RazorpayResponse) => {
    if (!order) return;
    setIsProcessing(true);
    setIsConfirming(true);
    try {
      const verified = await verifyPayment({
        orderId: order._id,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      finish({
        ...order,
        status: verified.status,
        paymentStatus: verified.paymentStatus,
        paymentDetails: {
          ...order.paymentDetails,
          razorpayPaymentId: verified.paymentId,
        },
      }, response.razorpay_payment_id);
    } catch (cause) {
      setIsProcessing(false);
      setIsConfirming(false);
      toast.error(cause instanceof Error ? cause.message : 'Payment verification failed');
      poll();
    }
  }, [finish, order, poll]);

  const openPayment = useCallback(() => {
    if (!order || !order.paymentDetails?.razorpayOrderId || isProcessing) return;
    if (!mockMode && !paymentKey) {
      setError('Razorpay publishable key is not configured.');
      return;
    }

    if (typeof window.Razorpay !== 'function') {
      setError('The Razorpay checkout library did not load. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    if (mockMode) {
      const now = Date.now();
      void handleVerifiedPayment({
        razorpay_order_id: order.paymentDetails.razorpayOrderId,
        razorpay_payment_id: `pay_mock_${now}`,
        razorpay_signature: `sig_mock_${now}`,
      });
      return;
    }

    try {
      const instance = new window.Razorpay({
        key: paymentKey,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        order_id: order.paymentDetails.razorpayOrderId,
        name: 'Shoe Style',
        description: `Order ${order.orderNumber}`,
        image: `${window.location.origin}/shoe-style-logo.svg`,
        handler: (response: RazorpayResponse) => { void handleVerifiedPayment(response); },
        prefill: {
          name: order.shippingAddress?.fullName || order.customerName || '',
          email: order.customerEmail || '',
          contact: order.shippingAddress?.phone || order.customerPhone || '',
        },
        notes: { order_id: order._id, order_number: order.orderNumber },
        retry: { enabled: true, max_count: 3 },
        theme: { color: '#1a1a1a' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setIsConfirming(false);
            setIsPolling(false);
            toast.info('Payment window closed. No payment was confirmed. You can try again.');
            void getOrder(order._id).then((latest) => {
              setOrder(latest);
              if (latest.paymentStatus === 'paid') finish(latest);
            }).catch(() => undefined);
          },
        },
      });
      instance.on('payment.failed', (failure) => {
        setIsProcessing(false);
        const failureReason = failure.error?.description || 'Payment attempt failed';
        toast.error(failureReason);
        void reportPaymentFailure({
          orderId: order._id,
          razorpayOrderId: failure.error?.metadata?.order_id,
          failureReason,
        });
      });
      instance.open();
    } catch {
      setIsProcessing(false);
      setError('Razorpay could not be opened. Please refresh and try again.');
    }
  }, [handleVerifiedPayment, isProcessing, mockMode, order, paymentKey, poll]);

  useEffect(() => {
    if (params.get('auto') === '1' && order && configReady && scriptReady && !autoOpened.current && order.paymentStatus !== 'paid') {
      autoOpened.current = true;
      openPayment();
    }
  }, [configReady, openPayment, order, params, scriptReady]);

  if (error) {
    return <div className="flex-1 p-8 max-w-2xl mx-auto"><Card><CardContent className="p-8 text-center space-y-4"><AlertCircle className="size-12 text-destructive mx-auto" /><h1 className="text-xl">Payment unavailable</h1><p className="text-muted-foreground">{error}</p><Link to="/checkout"><Button>Return to checkout</Button></Link></CardContent></Card></div>;
  }

  if (!order) {
    return <div className="flex-1 grid place-items-center p-8"><Loader2 className="size-8 animate-spin" aria-label="Loading payment" /></div>;
  }

  if (order.paymentStatus === 'paid') {
    return <div className="flex-1 p-8 max-w-xl mx-auto text-center"><CheckCircle2 className="size-16 text-black mx-auto mb-4" /><h1 className="text-2xl mb-2">Payment complete</h1><p className="text-muted-foreground mb-5">Order {order.orderNumber} is confirmed.</p><Button onClick={() => void finish(order)}>View confirmation</Button></div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto">
      <Link to="/checkout"><Button variant="ghost" className="mb-4"><ArrowLeft className="size-4 mr-2" />Back to checkout</Button></Link>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-8 text-center space-y-5">
            <div className="size-16 mx-auto bg-primary/10 rounded-full grid place-items-center"><Shield className="size-8" /></div>
            <div><h1 className="text-2xl font-semibold">Secure payment</h1><p className="text-muted-foreground">Razorpay will collect and verify your payment.</p></div>
            <Separator />
            {(isProcessing || isPolling) && <div className="flex justify-center items-center gap-2 text-sm" role="status" aria-live="polite"><Loader2 className="size-4 animate-spin" />{isPolling ? 'Checking payment status…' : isConfirming ? 'Payment received — confirming your order…' : 'Opening Razorpay…'}</div>}
            <Button size="lg" className="w-full" onClick={openPayment} disabled={!configReady || !scriptReady || isProcessing || isPolling}>
              <Shield className="size-4 mr-2" />Pay ₹{order.total.toLocaleString('en-IN')}
            </Button>
            {mockMode && <p className="text-xs font-medium text-black">Development-only mock payment mode is active.</p>}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Order {order.orderNumber}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => <div key={item._id} className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{item.productName} × {item.quantity}</span><span>₹{item.total.toLocaleString('en-IN')}</span></div>)}
            <Separator />
            <Row label="Subtotal" value={order.subtotal} />
            {order.discount > 0 && <Row label="Discount" value={-order.discount} />}
            <Row label="Tax" value={order.tax} />
            <Row label="Shipping" value={order.shippingCost} />
            <div className="flex justify-between font-semibold text-lg pt-2"><span>Total</span><span>₹{order.total.toLocaleString('en-IN')}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>₹{value.toLocaleString('en-IN')}</span></div>;
}
