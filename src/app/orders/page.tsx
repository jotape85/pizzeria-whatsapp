'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatPhone, formatPrice } from '@/lib/utils';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  customer: { phone: string; name: string | null };
  store: { name: string };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    note: string | null;
    product: { name: string };
    variant: { name: string } | null;
  }>;
};

const STATUS_OPTIONS = [
  'ALL', 'DRAFT', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID',
  'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED',
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const qs = status !== 'ALL' ? `?status=${status}` : '';
    const res = await fetch(`/api/orders${qs}`);
    const data = await res.json();
    setOrders(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [status]);

  const markAsPaid = async (orderId: string) => {
    setMarkingPaid(orderId);
    await fetch(`/api/orders/${orderId}/mark-paid`, { method: 'POST' });
    await fetchOrders();
    setMarkingPaid(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">N. pedido</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No hay pedidos</td></tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <p>{order.customer.name ?? formatPhone(order.customer.phone)}</p>
                  <p className="text-xs text-gray-400">{order.customer.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge status={order.paymentStatus} />
                </td>
                <td className="px-4 py-3 font-medium">{formatPrice(Number(order.total))}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3">
                  {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => markAsPaid(order.id)}
                      disabled={markingPaid === order.id}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {markingPaid === order.id ? '...' : 'Marcar pagado'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    SENT_TO_KITCHEN: 'bg-purple-100 text-purple-700',
    PREPARING: 'bg-orange-100 text-orange-700',
    READY: 'bg-teal-100 text-teal-700',
    COMPLETED: 'bg-green-200 text-green-800',
    CANCELLED: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-500',
    LINK_SENT: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
