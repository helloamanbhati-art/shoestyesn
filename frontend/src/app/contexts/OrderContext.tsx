import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../api/client';
import { getOrder, type OrderDetails } from '../checkout/paymentApi';
import { getGuestOrderIds } from '../guest/guestStorage';
import { useAuth } from './AuthContext';

interface OrderContextValue {
  orders: OrderDetails[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  getOrderById: (id: string) => OrderDetails | undefined;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, status } = useAuth();
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        setOrders(await apiRequest<OrderDetails[]>('/api/v1/orders'));
      } else {
        const results = await Promise.allSettled(getGuestOrderIds().map(getOrder));
        const guestOrders = results
          .filter((result): result is PromiseFulfilledResult<OrderDetails> => result.status === 'fulfilled')
          .map((result) => result.value)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        setOrders(guestOrders);
        if (results.length > 0 && guestOrders.length === 0) throw new Error('Saved guest orders could not be loaded');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Orders could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === 'loading') return;
    void refreshOrders();
  }, [isAuthenticated, refreshOrders, status]);

  const value = useMemo<OrderContextValue>(() => ({
    orders,
    loading,
    error,
    refreshOrders,
    getOrderById: (id) => orders.find((order) => order._id === id),
  }), [orders, loading, error, refreshOrders]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within OrderProvider');
  return context;
}
