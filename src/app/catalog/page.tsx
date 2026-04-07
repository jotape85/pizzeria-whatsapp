'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';

type Category = { id: string; name: string; emoji: string | null; isActive: boolean; _count: { products: number } };
type Product = { id: string; name: string; basePrice: string; isActive: boolean; description: string | null; variants: Array<{ id: string; name: string; priceAdjust: string }> };

export default function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetch('/api/catalog/categories')
      .then((r) => r.json())
      .then((data) => { setCategories(data); setLoadingCats(false); });
  }, []);

  useEffect(() => {
    if (!selectedCat) return;
    setLoadingProducts(true);
    fetch(`/api/catalog/products?categoryId=${selectedCat}`)
      .then((r) => r.json())
      .then((data) => { setProducts(data); setLoadingProducts(false); });
  }, [selectedCat]);

  const toggleProduct = async (productId: string, isActive: boolean) => {
    await fetch(`/api/catalog/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isActive: !isActive } : p))
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Catalogo</h1>

      <div className="flex gap-6">
        {/* Categories list */}
        <div className="w-56 shrink-0">
          <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Categorias</h2>
          {loadingCats ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setSelectedCat(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedCat === cat.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                    <span className="ml-1 text-xs opacity-60">({cat._count.products})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Products */}
        <div className="flex-1">
          {!selectedCat ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
              Selecciona una categoria para ver los productos
            </div>
          ) : loadingProducts ? (
            <p className="text-sm text-gray-400">Cargando productos...</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Precio base</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Variantes</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin productos</td></tr>
                  )}
                  {products.map((product) => (
                    <tr key={product.id} className={product.isActive ? '' : 'opacity-50'}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.name}</p>
                        {product.description && <p className="text-xs text-gray-400">{product.description}</p>}
                      </td>
                      <td className="px-4 py-3">{formatPrice(Number(product.basePrice))}</td>
                      <td className="px-4 py-3">
                        {product.variants.length > 0 ? (
                          <span className="text-xs text-gray-500">
                            {product.variants.map((v) => v.name).join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">Sin variantes</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleProduct(product.id, product.isActive)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {product.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
