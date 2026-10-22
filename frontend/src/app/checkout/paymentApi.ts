import { apiRequest } from '../api/client';
import { getGuestOrderToken } from '../guest/guestStorage';

const guestHeaders = (orderId: string) => {
  const token = getGuestOrderToken(orderId);
  return token ? { 'X-Guest-Order-Token': token } : undefined;
};

export interface OrderDetails {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  total: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  statusHistory?: Array<{ status: string; updatedAt: string; notes?: string }>;
  shippingAddress?: {
    fullName?: string; phone?: string; addressLine1?: string; addressLine2?: string;
    city?: string; state?: string; zipCode?: string; country?: string;
  };
  paymentDetails?: { razorpayOrderId?: string; razorpayPaymentId?: string };
  items: Array<{
    _id: string;
    productName: string;
    productImage?: string;
    brand?: string;
    size?: string | null;
    selectedComponents?: Array<{ componentId: string; name: string; size: string }>;
    color?: string | null;
    price: number;
    quantity: number;
    total: number;
    soldBy: 'meter' | 'piece';
    meters?: number;
  }>;
}

export function getOrder(orderId: string): Promise<OrderDetails> {
  return apiRequest(`/api/v1/orders/${encodeURIComponent(orderId)}`, { headers: guestHeaders(orderId) });
}

export function getPaymentConfig(): Promise<{ keyId: string; mockMode: boolean }> {
  return apiRequest('/api/v1/payments/config');
}

export function verifyPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return apiRequest<{
    orderId: string; orderNumber: string; status: string; paymentStatus: string;
    total: number; paymentId: string; paidAt: string;
  }>('/api/v1/payments/verify', { method: 'POST', headers: guestHeaders(input.orderId), body: JSON.stringify(input) });
}

export function reportPaymentFailure(input: {
  orderId: string;
  razorpayOrderId?: string;
  failureReason: string;
}) {
  return apiRequest('/api/v1/payments/failure', { method: 'POST', headers: guestHeaders(input.orderId), body: JSON.stringify(input) });
}
