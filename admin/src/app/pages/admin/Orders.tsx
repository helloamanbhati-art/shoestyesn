import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '../../api/client';

const statusConfig = {
  pending: { label: 'Order Placed', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  processing: { label: 'Processing', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  delivered: { label: 'Delivered', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  0: { label: 'Order Placed', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  1: { label: 'Processing', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  2: { label: 'Shipped', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  3: { label: 'Out for Delivery', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  4: { label: 'Delivered', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  refunded: { label: 'Refunded', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

export function Orders() {
  const { orders } = useOrders();
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const runFulfillmentAction = async (orderId: string, action: 'sync' | 'ship') => {
    setBusyOrderId(orderId);
    try {
      const response = await adminFetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/shiprocket/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': globalThis.crypto.randomUUID().replaceAll('-', '') },
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Shipping action could not be completed.');
      toast.success(action === 'ship' ? 'Pickup booked with Shiprocket.' : 'Order sync queued for Shiprocket.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shipping action failed.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage customer orders</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input placeholder="Search orders..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="size-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">#{order.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{order.customerEmail}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{order.items.length} items</td>
                    <td className="py-3 px-4 font-medium">₹{order.total.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={(statusConfig[order.status] || statusConfig.pending).color}>
                        {(statusConfig[order.status] || statusConfig.pending).label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {order.paymentStatus === 'paid' && order.fulfillment?.syncStatus === 'failed' && !order.fulfillment?.awbCode && (
                        <Button size="sm" variant="outline" disabled={busyOrderId === order.id} onClick={() => void runFulfillmentAction(order.id, 'sync')}>
                          {busyOrderId === order.id ? 'Working…' : 'Retry Shiprocket sync'}
                        </Button>
                      )}
                      {order.paymentStatus === 'paid' && order.fulfillment?.syncStatus === 'synced' && order.fulfillment.pickupStatus !== 'requested' && (
                        <Button size="sm" disabled={busyOrderId === order.id} onClick={() => void runFulfillmentAction(order.id, 'ship')}>
                          {busyOrderId === order.id ? 'Booking…' : 'Approve packed · book pickup'}
                        </Button>
                      )}
                      {order.fulfillment?.pickupStatus === 'requested' && (
                        <div className="text-xs text-muted-foreground">
                          {order.fulfillment.courierName || 'Courier'} · AWB {order.fulfillment.awbCode || 'pending'}
                          {order.fulfillment.labelUrl && <a className="ml-2 underline" href={order.fulfillment.labelUrl} target="_blank" rel="noreferrer">Shipping label</a>}
                          {order.fulfillment.manifestUrl && <a className="ml-2 underline" href={order.fulfillment.manifestUrl} target="_blank" rel="noreferrer">Manifest</a>}
                        </div>
                      )}
                      {order.paymentStatus === 'paid' && (!order.fulfillment?.syncStatus || ['not_ready', 'queued'].includes(order.fulfillment.syncStatus)) && (
                        <span className="text-xs text-muted-foreground">Shiprocket sync pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
