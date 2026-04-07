'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface OrderData {
  id: string;
  orderNumber: string;
  total: string;
  status: string;
  paymentStatus: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: string;
    note?: string;
    product: { name: string };
    variant?: { name: string };
  }[];
  customer: { name?: string; phone: string };
}

type PageState = 'loading' | 'ready' | 'paying' | 'paid' | 'error' | 'already_paid';

export default function MockPaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setPageState('error'); return; }
        setOrder(data);
        setPageState(data.paymentStatus === 'PAID' ? 'already_paid' : 'ready');
      })
      .catch(() => setPageState('error'));
  }, [orderId]);

  async function handlePay() {
    if (!order) return;
    setPageState('paying');
    try {
      const res = await fetch(`/api/orders/${order.id}/mark-paid`, { method: 'POST' });
      if (res.ok) {
        setPageState('paid');
      } else {
        const data = await res.json();
        if (data.error === 'Order is already paid') { setPageState('already_paid'); }
        else { setPageState('error'); }
      }
    } catch {
      setPageState('error');
    }
  }

  // ── Shared wrapper ──────────────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 px-6 py-5 text-white text-center">
          <div className="text-3xl mb-1">🍕</div>
          <h1 className="text-xl font-bold">Pizzería WhatsApp</h1>
          <p className="text-orange-100 text-sm mt-1">Pago seguro de pedido</p>
        </div>
        {children}
      </div>
    </div>
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <Wrapper>
        <div className="p-8 text-center text-gray-500">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p>Cargando pedido...</p>
        </div>
      </Wrapper>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (pageState === 'error' || !order) {
    return (
      <Wrapper>
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Pedido no encontrado</h2>
          <p className="text-gray-500 text-sm">
            Este link de pago no es válido o ha expirado. Contacta con nosotros por WhatsApp.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ── Already paid ────────────────────────────────────────────────────────────
  if (pageState === 'already_paid') {
    return (
      <Wrapper>
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">¡Pago ya completado!</h2>
          <p className="text-gray-600 text-sm">
            El pedido <strong>{order.orderNumber}</strong> ya está pagado y en preparación.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ── Paid ────────────────────────────────────────────────────────────────────
  if (pageState === 'paid') {
    return (
      <Wrapper>
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">¡Pago completado!</h2>
          <p className="text-gray-600 text-sm mb-4">
            Tu pedido <strong>{order.orderNumber}</strong> está en preparación.
            Recibirás un mensaje por WhatsApp cuando esté listo.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
            🍕 ¡Gracias por tu pedido!
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── Ready / Paying ──────────────────────────────────────────────────────────
  const total = Number(order.total);

  return (
    <Wrapper>
      <div className="p-6">
        {/* Order info */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pedido</span>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {order.orderNumber}
            </span>
          </div>
          {order.customer.name && (
            <p className="text-sm text-gray-500">Cliente: {order.customer.name}</p>
          )}
        </div>

        {/* Items */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
          <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Detalle del pedido
          </div>
          <ul className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <li key={item.id} className="px-4 py-3 flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.quantity > 1 && <span className="text-orange-500 font-bold mr-1">{item.quantity}×</span>}
                    {item.product.name}
                    {item.variant && (
                      <span className="text-gray-400 font-normal"> — {item.variant.name}</span>
                    )}
                  </p>
                  {item.note && (
                    <p className="text-xs text-gray-400 mt-0.5">📝 {item.note}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700 ml-4 shrink-0">
                  {(Number(item.unitPrice) * item.quantity).toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>
          <div className="bg-orange-50 px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-xl font-bold text-orange-600">{total.toFixed(2)} €</span>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={pageState === 'paying'}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          {pageState === 'paying' ? (
            <>
              <span className="animate-spin">⏳</span> Procesando...
            </>
          ) : (
            <>
              💳 Pagar {total.toFixed(2)} €
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          🔒 Pago simulado (entorno de pruebas)
        </p>
      </div>
    </Wrapper>
  );
}
