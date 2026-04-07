'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';

type LogEvent = {
  id: string;
  source: string;
  eventType: string | null;
  waMessageId: string | null;
  processed: boolean;
  error: string | null;
  createdAt: string;
  store: { name: string } | null;
  payload: unknown;
};

export default function LogsPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    const qs = filter === 'unprocessed' ? '?processed=false' : filter === 'processed' ? '?processed=true' : '';
    const res = await fetch(`/api/logs${qs}&limit=100`);
    const data = await res.json();
    setEvents(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [filter]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs de Webhook</h1>
        <button onClick={fetchLogs} className="text-sm text-blue-600 hover:underline">Actualizar</button>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'unprocessed', 'processed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {f === 'all' ? 'Todos' : f === 'unprocessed' ? 'Sin procesar' : 'Procesados'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-gray-400">Cargando...</p>}
        {!loading && events.length === 0 && <p className="text-sm text-gray-400">Sin eventos</p>}
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div
              className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === event.id ? null : event.id)}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${event.processed ? 'bg-green-400' : event.error ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <span className="text-xs text-gray-400 w-36 shrink-0">{formatDate(event.createdAt)}</span>
              <span className="text-xs font-medium text-gray-700 w-24 shrink-0">{event.eventType ?? 'unknown'}</span>
              <span className="text-xs text-gray-500 flex-1 truncate">{event.waMessageId ?? event.id}</span>
              {event.store && <span className="text-xs text-gray-400">{event.store.name}</span>}
              {event.error && <span className="text-xs text-red-500 truncate max-w-xs">{event.error}</span>}
            </div>
            {expanded === event.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <pre className="text-xs text-gray-700 overflow-auto max-h-64 font-mono">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
