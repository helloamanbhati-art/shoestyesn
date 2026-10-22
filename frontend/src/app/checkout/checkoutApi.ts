import { apiRequest } from '../api/client';

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  houseName?: string;
  building?: string;
  street?: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id'>;

export interface CheckoutQuote {
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  total: number;
  currency: 'INR';
}

export interface CheckoutOrder {
  order: {
    _id: string;
    orderNumber: string;
    total: number;
    subtotal: number;
    tax: number;
    discount: number;
    shippingCost: number;
  };
  razorpayOrder: { id: string; amount: number; currency: string };
  guestAccessToken?: string;
}

export async function getAddresses(): Promise<Address[]> {
  const result = await apiRequest<{ addresses: Address[] }>('/api/v1/auth/addresses');
  return result.addresses;
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const result = await apiRequest<{ address: Address }>('/api/v1/auth/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.address;
}

export async function quoteCheckout(
  shippingAddress: Omit<AddressInput, 'type' | 'isDefault'>,
  couponCode?: string,
  items?: GuestCartSelection[],
  checkoutMode?: 'buyNow',
): Promise<CheckoutQuote> {
  return apiRequest('/api/v1/orders/quote', {
    method: 'POST',
    body: JSON.stringify({
      shippingAddress,
      couponCode: couponCode || '',
      ...(items ? { items } : {}),
      ...(checkoutMode ? { checkoutMode } : {}),
    }),
  });
}

export async function createCheckoutOrder(input: {
  addressId?: string;
  guest?: { email: string; shippingAddress: Omit<AddressInput, 'type' | 'isDefault'> };
  items?: GuestCartSelection[];
  couponCode?: string;
  customerNotes?: string;
  checkoutMode?: 'buyNow';
  idempotencyKey: string;
}): Promise<CheckoutOrder> {
  return apiRequest('/api/v1/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      ...(input.addressId ? { addressId: input.addressId } : { guest: input.guest, items: input.items }),
      ...(input.addressId && input.items ? { items: input.items } : {}),
      ...(input.checkoutMode ? { checkoutMode: input.checkoutMode } : {}),
      paymentMethod: 'razorpay',
      shippingMethod: 'standard',
      couponCode: input.couponCode || '',
      customerNotes: input.customerNotes || '',
    }),
  });
}

export interface GuestCartSelection {
  productId: string;
  variantId?: string | null;
  selectedSize?: string | null;
  selectedComponents?: Array<{ componentId: string; size: string }>;
  selectedColor?: string | null;
  meters?: number | null;
  quantity: number;
}

export async function updateCheckoutProfile(input: { firstName: string; lastName: string; email: string }) {
  return apiRequest('/api/v1/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
