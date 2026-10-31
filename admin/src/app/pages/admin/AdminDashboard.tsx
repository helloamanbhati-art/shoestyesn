import { ArrowRight, Clock3, Plus, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useOrders } from '../../contexts/OrderContext';
import {
  filterOrdersByDay,
  formatOrderDateTime,
  getRecentOrderDayOptions,
  isOrderFromToday,
  sortOrdersNewestFirst,
} from '../../utils/orderPresentation.mjs';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  0: 'Order placed',
  1: 'Processing',
  2: 'Shipped',
  3: 'Out for delivery',
  4: 'Delivered',
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  confirmed: 'border-green-200 bg-green-50 text-green-800',
  processing: 'border-blue-200 bg-blue-50 text-blue-800',
  shipped: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  out_for_delivery: 'border-violet-200 bg-violet-50 text-violet-800',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  cancelled: 'border-red-200 bg-red-50 text-red-800',
  refunded: 'border-slate-200 bg-slate-50 text-slate-700',
  0: 'border-amber-200 bg-amber-50 text-amber-800',
  1: 'border-blue-200 bg-blue-50 text-blue-800',
  2: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  3: 'border-violet-200 bg-violet-50 text-violet-800',
  4: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export function AdminDashboard() {
  const { orders, loading, error } = useOrders();
  const orderDayOptions = useMemo(() => getRecentOrderDayOptions(), []);
  const [dayFilter, setDayFilter] = useState(() => orderDayOptions[0].value);
  const recentOrders = filterOrdersByDay(sortOrdersNewestFirst(orders), dayFilter);

  return (
    <section className="w-full space-y-6" aria-labelledby="add-product-title">
      <h1 id="add-product-title" className="sr-only">Store activity</h1>
      <Button
        asChild
        className="h-20 w-full !bg-yellow-400 px-6 text-xl font-bold !text-black shadow-md hover:!bg-yellow-500 focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 [&_svg]:!text-black sm:h-24 sm:text-2xl"
      >
        <Link to="/admin/products?action=add&from=dashboard">
          <Plus className="size-7 sm:size-8" aria-hidden="true" />
          Add Product
        </Link>
      </Button>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-4 px-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden="true" />
              Orders
            </CardTitle>
            <p className="mt-1 text-sm text-gray-500">Newest orders appear first</p>
          </div>
          <Badge variant="secondary">{recentOrders.length}</Badge>
        </CardHeader>
        <CardContent className="px-0">
          <div className="mb-4 border border-gray-200 bg-white p-3 shadow-sm">
            <label htmlFor="order-day-filter" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Show orders from
            </label>
            <select
              id="order-day-filter"
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="min-h-11 w-full border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/25"
            >
              {orderDayOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-600" aria-live="polite">
              Showing {recentOrders.length} of {orders.length} orders
            </p>
          </div>
          {loading && <p role="status" className="py-8 text-center text-sm text-gray-500">Loading orders…</p>}
          {!loading && error && <p role="status" className="mb-4 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">Orders are reconnecting automatically. Existing data remains available.</p>}
          {!loading && !error && recentOrders.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              <ShoppingBag className="mx-auto mb-3 size-10 opacity-50" aria-hidden="true" />
              <p className="font-medium text-gray-800">No orders in this time period</p>
              <p className="mt-1 text-sm">Choose another day filter to see more orders.</p>
            </div>
          )}
          {!loading && recentOrders.length > 0 && (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const orderId = order.id || order._id;
                const orderNumber = order.orderNumber || String(orderId).slice(-10);
                const normalizedStatus = String(order.status);
                const statusLabel = statusLabels[normalizedStatus] || normalizedStatus;

                return (
                  <Link
                    key={orderId}
                    to={`/admin/orders?order=${encodeURIComponent(orderId)}`}
                    className="group block w-full rounded-none bg-white p-4 shadow-sm transition hover:bg-green-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:p-5"
                    aria-label={`View ${statusLabel.toLowerCase()} order details for ${orderNumber}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge
                        variant="outline"
                        className={`px-2.5 py-1 font-semibold ${statusStyles[normalizedStatus] || 'border-gray-200 bg-gray-50 text-gray-700'}`}
                      >
                        {statusLabel}
                      </Badge>
                      <span className="shrink-0 text-lg font-bold text-gray-950">₹{(order.total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="mt-2 font-mono font-semibold text-gray-950">{orderNumber}</p>
                    <p className="mt-3 truncate text-sm text-gray-700">
                      {order.customerName} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      <time dateTime={order.createdAt}>{formatOrderDateTime(order.createdAt)}</time>
                      {isOrderFromToday(order.createdAt) && (
                        <span className="ml-1 bg-green-100 px-2 py-1 font-bold text-green-800">Ordered today</span>
                      )}
                    </p>

                    <div className="mt-4">
                      <span className="mb-2 block text-center text-xs text-gray-500 sm:hidden">Tap anywhere to view details</span>
                      <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-none bg-green-600 px-4 text-sm font-semibold text-white transition group-hover:bg-green-700">
                        View order
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
