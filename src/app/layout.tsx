import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pizzería WhatsApp — Panel',
  description: 'Panel de gestión de pedidos por WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-gray-50">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
            <div className="px-4 py-5 border-b border-gray-700">
              <p className="text-lg font-bold">🍕 Pizzería</p>
              <p className="text-xs text-gray-400 mt-0.5">Panel WhatsApp</p>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              <NavLink href="/conversations" label="💬 Conversaciones" />
              <NavLink href="/orders" label="📦 Pedidos" />
              <NavLink href="/catalog" label="📋 Catálogo" />
              <NavLink href="/logs" label="🔍 Logs" />
              <NavLink href="/settings" label="⚙️ Configuración" />
            </nav>
            <div className="px-4 py-3 border-t border-gray-700">
              <p className="text-xs text-gray-500">MVP v0.1.0</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
    >
      {label}
    </a>
  );
}
