import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatDate, formatPhone, formatPrice } from '@/lib/utils';

export const revalidate = 0;

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      botSession: { include: { store: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) notFound();

  const cart = await prisma.cart.findUnique({
    where: { customerId: conversation.customer.id },
    include: { items: { include: { product: true, variant: true } } },
  });

  const cartTotal = cart?.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  ) ?? 0;

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* Left panel — info */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Customer */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
          <p className="font-medium">{conversation.customer.name ?? '—'}</p>
          <p className="text-sm text-gray-500">{formatPhone(conversation.customer.phone)}</p>
          <p className="text-xs text-gray-400 mt-1">Desde {formatDate(conversation.customer.createdAt)}</p>
        </div>

        {/* Bot session */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sesion del bot</h2>
          {conversation.botSession ? (
            <>
              <p className="text-sm">
                Estado: <span className="font-medium">{conversation.botSession.state}</span>
              </p>
              {conversation.botSession.store && (
                <p className="text-sm text-gray-500">Tienda: {conversation.botSession.store.name}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Ultima actividad: {formatDate(conversation.botSession.lastActivityAt)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin sesion activa</p>
          )}
        </div>

        {/* Cart */}
        {cart && cart.items.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Carrito actual</h2>
            <ul className="space-y-2 text-sm">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-gray-700">
                    {item.product.name}
                    {item.variant ? ` (${item.variant.name})` : ''}
                    {item.note ? ` — ${item.note}` : ''}
                  </span>
                  <span className="font-medium">{formatPrice(Number(item.unitPrice))}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — messages */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Mensajes</h2>
          <p className="text-xs text-gray-400">{conversation.messages.length} mensajes</p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-sm px-3 py-2 rounded-lg text-sm ${
                  msg.direction === 'INBOUND'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-green-500 text-white'
                }`}
              >
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'INBOUND' ? 'text-gray-400' : 'text-green-100'}`}>
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {conversation.messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-8">Sin mensajes</p>
          )}
        </div>
      </div>
    </div>
  );
}
