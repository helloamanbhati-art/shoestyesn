import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { adminFetch } from '../api/client';
import { fetchAdminOrderChanges, fetchAdminOrderSnapshot } from '../api/adminOrders.mjs';

export interface SelectedVariantSnapshot {
  variantId: string;
  variantName: string;
  color?: string | null;
  pattern?: string | null;
  sku?: string | null;
  thumbnail?: string | null;
  primaryImage?: string | null;
  galleryImages?: string[];
  priceAtPurchase?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  brand: string;
  price: number;
  quantity: number;
  meters?: number;
  soldBy: 'meter' | 'piece';
  size?: string | null;
  selectedComponents?: Array<{ componentId: string; name: string; size: string }>;
  selectedVariant?: SelectedVariantSnapshot;
}

export interface StatusHistory {
  status:
    | 0
    | 1
    | 2
    | 3
    | 4
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  statusName: string;
  timestamp: string;
  updatedBy: string;
  notes?: string;
}

export interface Order {
  id: string;
  _id?: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  shippingMethod?: string;
  carrier?: string;
  trackingNumber?: string;
  billingAddress?: any;
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    transactionId?: string;
    paidAmount?: number;
    paidAt?: string;
    failureReason?: string;
  };
  status:
    | 0
    | 1
    | 2
    | 3
    | 4
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  createdAt: string;
  shippingAddress?: string;
  statusHistory?: StatusHistory[];
}

const normalizeOrder = (order: any): Order => ({
  ...order,
  id: order.id || order._id || '',
  _id: order._id || order.id,
  orderNumber: order.orderNumber || (order._id ? String(order._id).slice(-10) : undefined),
  status: order.status,
  createdAt: order.createdAt || '',
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  paymentDetails: order.paymentDetails || {},
  shippingMethod: order.shippingMethod,
  carrier: order.carrier,
  trackingNumber: order.trackingNumber,
  billingAddress: order.billingAddress,
});
const statusNames: Record<number | string, string> = {
  0: 'Order Placed',
  1: 'Processing',
  2: 'Shipped',
  3: 'Out for Delivery',
  4: 'Delivered',
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function useOrdersAPI() {
  const { admin, loading: authLoading } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // Fetch orders on mount
  useEffect(() => {
    let active = true;
    let refreshInFlight = false;
    let syncCursor: string | null = null;
    let hasLoadedSnapshot = false;
    const fetchOrders = async (forceSnapshot = false) => {
      if (authLoading) return;
      if (!admin) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (document.visibilityState !== 'visible' || !navigator.onLine || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const requestOptions = { headers: getAuthHeaders(), credentials: 'include' as const };
        if (forceSnapshot || !syncCursor) {
          const snapshot = await fetchAdminOrderSnapshot(adminFetch, '', requestOptions);
          syncCursor = snapshot.cursor;
          hasLoadedSnapshot = true;
          if (active) setOrders(snapshot.orders.map(normalizeOrder));
        } else {
          const changes = await fetchAdminOrderChanges(adminFetch, '', syncCursor, requestOptions);
          syncCursor = changes.cursor;
          if (changes.hasMore) {
            syncCursor = null;
          } else if (active && changes.orders.length > 0) {
            const changedOrders = changes.orders.map(normalizeOrder);
            setOrders((currentOrders) => {
              const byId = new Map(currentOrders.map((order) => [order.id, order]));
              for (const order of changedOrders) byId.set(order.id, order);
              return [...byId.values()].sort(
                (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
              );
            });
          }
        }
        if (active) setError(null);
      } catch (err) {
        if (active) {
          if (!hasLoadedSnapshot) setError(err instanceof Error ? err.message : 'Failed to load orders');
        }
      } finally {
        refreshInFlight = false;
        if (active) setLoading(false);
      }
    };

    fetchOrders();
    const refreshTimer = window.setInterval(() => fetchOrders(), 3_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };
    const refreshWhenOnline = () => fetchOrders(true);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', refreshWhenOnline);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenOnline);
    };
  }, [admin, authLoading]);

  const addOrder = async (newOrder: Order) => {
    try {
      const response = await adminFetch('/api/v1/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(newOrder),
      });

      if (response.ok) {
        const savedResponse = await response.json();
        const savedOrder = savedResponse.data?.order || savedResponse.data || savedResponse;
        const normalizedOrder = normalizeOrder(savedOrder);
        setOrders(prev => [normalizedOrder, ...prev]);
        toast.success('Order placed successfully!');
        return normalizedOrder;
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order could not be saved');
      throw err;
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order['status'],
    notes?: string
  ) => {
    const statusHistoryEntry: StatusHistory = {
      status: newStatus,
      statusName: statusNames[newStatus] || 'Unknown',
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin',
      notes,
    };

    try {
      const response = await adminFetch(
        `/api/v1/admin/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ status: newStatus, notes }),
        }
      );

      if (response.ok) {
        const updateResponse = await response.json();
        const updatedOrder = updateResponse.data || updateResponse;
        const normalizedOrder = normalizeOrder(updatedOrder);
        setOrders(prev =>
          prev.map(order =>
            order.id === orderId || order._id === orderId
              ? {
                  ...normalizedOrder,
                  statusHistory: [
                    ...(normalizedOrder.statusHistory || []),
                    statusHistoryEntry,
                  ],
                }
              : order
          )
        );
        toast.success('Order status updated successfully!');
        return normalizedOrder;
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order status could not be updated');
      throw err;
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find(order => order.id === orderId || order._id === orderId);
  };

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrderStatus,
    getOrderById,
  };
}
