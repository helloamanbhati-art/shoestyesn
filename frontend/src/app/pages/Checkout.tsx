import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { createAddress, createCheckoutOrder, getAddresses, quoteCheckout, updateCheckoutProfile, type AddressInput, type CheckoutQuote, type GuestCartSelection } from '../checkout/checkoutApi';
import { getDeliveryPhoneField, isValidDeliveryPhone, normalizeDeliveryPhone } from '../checkout/deliveryPhone';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { clearGuestData, loadGuestCheckoutProfile, saveGuestCheckoutProfile, saveGuestOrderToken } from '../guest/guestStorage';
import { clearBuyNowItem, loadBuyNowItem } from '../checkout/buyNowStorage';
import { getCheckoutSubmitState } from '../checkout/checkoutSubmitState';

interface FormData {
  firstName: string; lastName: string; email: string; phone: string;
  houseName: string; building: string; street: string; landmark: string;
  city: string; state: string; zip: string;
}

const emptyForm: FormData = {
  firstName: '', lastName: '', email: '', phone: '', houseName: '', building: '',
  street: '', landmark: '', city: '', state: '', zip: '',
};

function addressFrom(form: FormData): AddressInput {
  return {
    type: 'home',
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    phone: normalizeDeliveryPhone(form.phone),
    addressLine1: [form.houseName, form.building, form.street].map((part) => part.trim()).filter(Boolean).join(', '),
    addressLine2: form.landmark.trim(),
    houseName: form.houseName.trim(), building: form.building.trim(), street: form.street.trim(), landmark: form.landmark.trim(),
    city: form.city.trim(), state: form.state.trim(), zipCode: form.zip.trim(),
    country: 'India', isDefault: true,
  };
}

function isComplete(form: FormData) {
  return Boolean(
    form.firstName.trim() && form.lastName.trim() && form.email.includes('@') && isValidDeliveryPhone(form.phone) &&
    form.houseName.trim() && form.building.trim() && form.street.trim() && form.city.trim() &&
    form.state.trim() && /^\d{6}$/.test(form.zip.trim()),
  );
}

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '');
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const location = useLocation();
  const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buy-now';
  const { customer, isAuthenticated, openLogin } = useAuth();
  const { items, totalPrice, isSyncing, clearCart } = useCart();
  const [buyNowItem] = useState(() => isBuyNow ? loadBuyNowItem() : null);
  const checkoutItems = useMemo(() => buyNowItem ? [buyNowItem] : (isBuyNow ? [] : items), [buyNowItem, isBuyNow, items]);
  const [form, setForm] = useState<FormData>(() => loadGuestCheckoutProfile() || emptyForm);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const idempotencyKey = useRef(createIdempotencyKey());
  const skipNextGuestSave = useRef(false);
  const phoneField = getDeliveryPhoneField(customer?.phone);
  const checkoutSelections = useMemo<GuestCartSelection[]>(() => checkoutItems.map((item) => ({
    productId: item.id,
    variantId: item.selectedVariant?.variantId || 'default',
    selectedSize: item.selectedSize || null,
    selectedComponents: item.selectedComponents?.map(({ componentId, size }) => ({ componentId, size })) || [],
    selectedColor: item.selectedColor || null,
    meters: item.selectedMeters || null,
    quantity: item.quantity,
  })), [checkoutItems]);

  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({
      ...current,
      firstName: current.firstName || customer.firstName || '',
      lastName: current.lastName || customer.lastName || '',
      email: current.email || customer.email || '',
      phone: customer.phone || current.phone,
    }));
    void getAddresses().then((addresses) => {
      const address = addresses.find((candidate) => candidate.isDefault) || addresses[0];
      if (!address) return;
      setForm((current) => ({
        ...current,
        phone: customer.phone || current.phone || address.phone || '',
        houseName: current.houseName || address.houseName || address.addressLine1,
        building: current.building || address.building || '',
        street: current.street || address.street || '',
        landmark: current.landmark || address.landmark || address.addressLine2,
        city: current.city || address.city,
        state: current.state || address.state,
        zip: current.zip || address.zipCode,
      }));
    }).catch(() => undefined);
  }, [customer]);

  useEffect(() => {
    if (!isComplete(form) || checkoutItems.length === 0) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsQuoting(true);
      const request = isAuthenticated && !isBuyNow
        ? quoteCheckout(addressFrom(form))
        : quoteCheckout(addressFrom(form), undefined, checkoutSelections, isBuyNow ? 'buyNow' : undefined);
      void request
        .then(setQuote)
        .catch((error) => {
          setQuote(null);
          toast.error(error instanceof Error ? error.message : 'Could not calculate checkout total');
        })
        .finally(() => setIsQuoting(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [checkoutItems.length, checkoutSelections, form, isAuthenticated, isBuyNow]);

  useEffect(() => {
    if (skipNextGuestSave.current) {
      skipNextGuestSave.current = false;
      return;
    }
    if (!isAuthenticated) saveGuestCheckoutProfile(form);
  }, [form, isAuthenticated]);

  const deleteGuestData = () => {
    skipNextGuestSave.current = true;
    clearCart();
    clearBuyNowItem();
    clearGuestData();
    setForm(emptyForm);
    toast.success('Guest data deleted from this browser.');
  };

  const selectionTotal = useMemo(() => checkoutItems.reduce((sum, item) => {
    const price = item.soldBy === 'meter' && item.selectedMeters === 5
      ? item.price + (item.compareAtPrice || 0)
      : item.price;
    return sum + (price + (item.additionalChargeAmount || 0)) * item.quantity;
  }, 0), [checkoutItems]);
  const displayed = useMemo(() => {
    const fallbackTotal = isBuyNow ? selectionTotal : totalPrice;
    return quote || { subtotal: fallbackTotal, discount: 0, tax: 0, shippingCost: 0, total: fallbackTotal };
  }, [isBuyNow, quote, selectionTotal, totalPrice]);
  const submitState = getCheckoutSubmitState({
    formComplete: isComplete(form),
    quoteReady: Boolean(quote),
    isQuoting,
    isProcessing,
    isSyncing,
  });

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [event.target.id]: event.target.value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isComplete(form)) {
      toast.error('Please complete all required delivery details.');
      return;
    }
    if (isQuoting) {
      toast.info('Please wait while we verify prices and availability.');
      return;
    }
    if (!quote) {
      toast.error('Checkout could not be verified. Check your delivery details and try again.');
      return;
    }
    setIsProcessing(true);
    try {
      let result;
      if (isAuthenticated) {
        await updateCheckoutProfile({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() });
        const saved = await createAddress(addressFrom(form));
        result = await createCheckoutOrder({
          addressId: saved.id,
          ...(isBuyNow ? { items: checkoutSelections, checkoutMode: 'buyNow' as const } : {}),
          idempotencyKey: idempotencyKey.current,
        });
      } else {
        saveGuestCheckoutProfile(form);
        result = await createCheckoutOrder({
          guest: { email: form.email.trim(), shippingAddress: addressFrom(form) },
          items: checkoutSelections,
          ...(isBuyNow ? { checkoutMode: 'buyNow' as const } : {}),
          idempotencyKey: idempotencyKey.current,
        });
        if (!result.guestAccessToken) throw new Error('Guest order access could not be created');
        saveGuestOrderToken(result.order._id, result.guestAccessToken);
        if (!isBuyNow) clearCart();
      }
      if (isBuyNow) clearBuyNowItem();
      navigate(`/payment?orderId=${encodeURIComponent(result.order._id)}&auto=1`);
    } catch (error) {
      // A failed attempt may have been compensated server-side. A fresh key
      // lets the customer safely retry without reusing a cancelled checkout.
      idempotencyKey.current = createIdempotencyKey();
      toast.error(error instanceof Error ? error.message : 'Checkout could not be created');
      setIsProcessing(false);
    }
  };

  if (!checkoutItems.length && !isSyncing) {
    return <div className="flex-1 p-8 text-center"><ShoppingBag className="size-16 mx-auto mb-4 text-muted-foreground" /><h2 className="text-2xl mb-4">Your cart is empty</h2><Link to="/"><Button>Continue Shopping</Button></Link></div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto">
      <Link to="/cart"><Button variant="ghost" className="mb-4"><ArrowLeft className="size-4 mr-2" />Back to Cart</Button></Link>
      <h1 className="text-xl md:text-2xl mb-6">Checkout</h1>
      {!isAuthenticated && (
        <section className="mb-6 border bg-muted/30 p-4" aria-labelledby="guest-checkout-heading">
          <h2 id="guest-checkout-heading" className="font-semibold">Continue as guest</h2>
          <p className="mt-1 text-sm text-muted-foreground">No account is required. Your cart and delivery details stay in this browser until you delete them.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openLogin}>Sign in instead</Button>
            <Button type="button" variant="ghost" onClick={deleteGuestData}>Delete guest data</Button>
          </div>
        </section>
      )}
        <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Delivery address</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Field id="firstName" label="First name" value={form.firstName} onChange={onChange} />
                <Field id="lastName" label="Last name" value={form.lastName} onChange={onChange} />
                <Field id="email" label="Email" type="email" value={form.email} onChange={onChange} />
                <Field
                  id="phone"
                  label={phoneField.label}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChange={onChange}
                  readOnly={phoneField.readOnly}
                />
              </div>
              <Field id="houseName" label="House / flat number" value={form.houseName} onChange={onChange} />
              <Field id="building" label="Building / society" value={form.building} onChange={onChange} />
              <Field id="street" label="Street / road / area" value={form.street} onChange={onChange} />
              <Field id="landmark" label="Landmark (optional)" value={form.landmark} onChange={onChange} required={false} />
              <div className="grid md:grid-cols-3 gap-4">
                <Field id="city" label="City" value={form.city} onChange={onChange} />
                <Field id="state" label="State" value={form.state} onChange={onChange} />
                <Field id="zip" label="PIN code" value={form.zip} onChange={onChange} maxLength={6} inputMode="numeric" />
              </div>
            </CardContent>
          </Card>
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <section aria-labelledby="checkout-items-heading" className="border-b pb-4">
                <h2 id="checkout-items-heading" className="mb-3 text-sm font-semibold">You're buying</h2>
                <ul className="space-y-4">
                  {checkoutItems.map((item) => {
                    const image = item.selectedVariant?.primaryImage || item.selectedVariant?.thumbnail || item.image;
                    const selection = [
                      item.selectedVariant?.variantName && item.selectedVariant.variantName !== 'Default' ? item.selectedVariant.variantName : null,
                      item.selectedColor,
                      item.selectedSize ? `Size ${item.selectedSize}` : null,
                      item.selectedMeters ? `${item.selectedMeters} metres` : null,
                    ].filter(Boolean);
                    return (
                      <li key={item.cartItemId || `${item.id}-${item.selectedVariant?.variantId || 'default'}-${item.selectedSize || ''}`} className="flex gap-3">
                        <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center"><ShoppingBag className="size-5 text-muted-foreground" aria-hidden="true" /></span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{item.name}</p>
                          {selection.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{selection.join(' · ')}</p>}
                          {item.selectedComponents?.length ? (
                            <ul className="mt-1 text-xs text-muted-foreground">
                              {item.selectedComponents.map((component) => <li key={component.componentId}>{component.name}: {component.size}</li>)}
                            </ul>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">Quantity {item.quantity}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <Price label="Subtotal" value={displayed.subtotal} />
              {displayed.discount > 0 && <Price label="Discount" value={-displayed.discount} />}
              <Price label="Tax" value={displayed.tax} />
              <Price label="Shipping" value={displayed.shippingCost} />
              <div className="flex justify-between border-t pt-3 font-semibold text-lg"><span>Total</span><span>₹{displayed.total.toLocaleString('en-IN')}</span></div>
              {isQuoting && <p className="text-xs text-muted-foreground">Updating from the server…</p>}
              <Button type="submit" size="lg" className="w-full" disabled={submitState.disabled}>
                {isProcessing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShoppingBag className="size-4 mr-2" />}
                {isProcessing ? 'Creating secure payment…' : 'Proceed to payment'}
              </Button>
              <p className="text-xs text-center text-muted-foreground" aria-live="polite">{submitState.message}</p>
            </CardContent>
          </Card>
        </form>
    </div>
  );
}

function Field({ id, label, required = true, ...props }: React.ComponentProps<typeof Input> & { id: string; label: string; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required ? ' *' : ''}</Label><Input id={id} required={required} {...props} /></div>;
}

function Price({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>₹{value.toLocaleString('en-IN')}</span></div>;
}
