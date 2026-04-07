import { prisma } from '@/lib/prisma';
import { formatDate, formatPhone } from '@/lib/utils';

export const revalidate = 0;

type ConvRow = {
  id: string;
  updatedAt: Date;
  customer: { phone: string; name: string | null };
  botSession: { state: string } | null;
  messages: Array<{ content: string; direction: string }>;
};

export default async function ConversationsPage() {
  let conversations: ConvRow[] = [];
  let dbError: string | null = null;

  try {
    conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { phone: true, name: true } },
        botSession: { select: { state: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, direction: true },
        },
      },
    });
  } catch {
    dbError = 'Sin conexion a la base de datos. Configura DATABASE_URL en .env y ejecuta: npm run db:migrate && npm run db:seed';
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversaciones</h1>

      {dbError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Base de datos no configurada</p>
          <p className="text-xs font-mono">{dbError}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ultimo mensaje</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado bot</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actualizado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conversations.length === 0 && !dbError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay conversaciones. Envia un mensaje por WhatsApp para empezar.
                </td>
              </tr>
            )}
            {dbError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-300 text-xs">
                  Sin datos
                </td>
              </tr>
            )}
            {conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              return (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {conv.customer.name ?? formatPhone(conv.customer.phone)}
                    </p>
                    <p className="text-xs text-gray-400">{conv.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {lastMsg ? (
                      <span className="text-gray-700">
                        {lastMsg.direction === 'INBOUND' ? 'v ' : '^ '}
                        {lastMsg.content.slice(0, 60)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BotStateBadge state={conv.botSession?.state ?? 'IDLE'} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(conv.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/conversations/${conv.id}`} className="text-blue-600 hover:underline text-xs">Ver</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BotStateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    IDLE: 'bg-gray-100 text-gray-600',
    GREETING: 'bg-blue-100 text-blue-700',
    CATEGORY_SELECTION: 'bg-yellow-100 text-yellow-700',
    PRODUCT_SELECTION: 'bg-yellow-100 text-yellow-700',
    VARIANT_SELECTION: 'bg-yellow-100 text-yellow-700',
    ADDING_NOTE: 'bg-purple-100 text-purple-700',
    CART_REVIEW: 'bg-orange-100 text-orange-700',
    CONFIRMING: 'bg-orange-100 text-orange-700',
    AWAITING_PAYMENT: 'bg-red-100 text-red-700',
    ORDER_COMPLETE: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  );
}
