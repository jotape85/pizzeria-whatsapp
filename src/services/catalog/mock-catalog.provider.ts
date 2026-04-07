import { prisma } from '@/lib/prisma';
import type { CatalogCategory, CatalogProduct, CatalogProvider } from './catalog.provider.interface';

/**
 * Mock catalog provider — reads from the local PostgreSQL database.
 * This is the implementation used for the MVP.
 *
 * TODO: Replace with revo-catalog.provider.ts when Revo Solo API credentials
 * are available and the catalog sync is set up.
 */
export class MockCatalogProvider implements CatalogProvider {
  async getCategories(): Promise<CatalogCategory[]> {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji ?? undefined,
      description: c.description ?? undefined,
      sortOrder: c.sortOrder,
    }));
  }

  async getProductsByCategory(categoryId: string): Promise<CatalogProduct[]> {
    const products = await prisma.product.findMany({
      where: { categoryId, isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description ?? undefined,
      basePrice: Number(p.basePrice),
      imageUrl: p.imageUrl ?? undefined,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceAdjust: Number(v.priceAdjust),
        sortOrder: v.sortOrder,
      })),
    }));
  }

  async getProductById(productId: string): Promise<CatalogProduct | null> {
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) return null;

    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? undefined,
      basePrice: Number(product.basePrice),
      imageUrl: product.imageUrl ?? undefined,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceAdjust: Number(v.priceAdjust),
        sortOrder: v.sortOrder,
      })),
    };
  }
}
