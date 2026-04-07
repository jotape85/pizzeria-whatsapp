'use client';

import { useEffect, useState } from 'react';

type Store = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  waNumberId: string | null;
  address: string | null;
  isActive: boolean;
  botEnabled: boolean;
};

export default function SettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stores').then((r) => r.json()).then(setStores);
  }, []);

  const toggleBot = async (store: Store) => {
    setSaving(store.id);
    const res = await fetch('/api/stores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: store.id, botEnabled: !store.botEnabled }),
    });
    const updated = await res.json();
    setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSaving(null);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuracion</h1>

      {/* WhatsApp config info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">WhatsApp API</h2>
        <div className="space-y-3 text-sm">
          <ConfigRow label="Webhook URL" value={`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/webhook`} />
          <ConfigRow label="Verify Token" value="Configurado en .env (WHATSAPP_VERIFY_TOKEN)" />
          <ConfigRow label="Catalog Provider" value={process.env.CATALOG_PROVIDER ?? 'mock'} />
          <ConfigRow label="Order Provider" value={process.env.ORDER_PROVIDER ?? 'mock'} />
          <ConfigRow label="Payment Provider" value={process.env.PAYMENT_PROVIDER ?? 'mock'} />
        </div>
      </div>

      {/* Stores */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Tiendas</h2>
        {stores.length === 0 && <p className="text-sm text-gray-400">Cargando...</p>}
        {stores.map((store) => (
          <div key={store.id} className="border border-gray-100 rounded p-4 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{store.name}</p>
                <p className="text-xs text-gray-500">{store.slug}</p>
                {store.phone && <p className="text-xs text-gray-500">{store.phone}</p>}
                {store.address && <p className="text-xs text-gray-400">{store.address}</p>}
                <p className="text-xs text-gray-400 mt-1">ID: <code className="font-mono">{store.id}</code></p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">Bot</span>
                <button
                  onClick={() => toggleBot(store)}
                  disabled={saving === store.id}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${store.botEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${store.botEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Integraciones pendientes</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Revo Solo — catalogo y pedidos (configurar REVO_API_KEY en .env)</li>
          <li>Revo Xpress — link de pago (configurar REVO_XPRESS_* en .env)</li>
          <li>Revo XEF — KDS (se activa automaticamente via Revo Solo)</li>
        </ul>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-36 shrink-0">{label}</span>
      <code className="text-gray-800 font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">{value}</code>
    </div>
  );
}
