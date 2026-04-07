import type { CatalogCategory, CatalogProduct, CatalogProvider } from './catalog.provider.interface';

/**
 * Revo Solo catalog provider — stub for future implementation.
 *
 * TODO: Implement using Revo Solo REST API.
 * Docs: https://developers.revo.works (obtain access from Revo support)
 *
 * Steps to activate:
 * 1. Set REVO_API_BASE_URL and REVO_API_KEY in .env
 * 2. Implement getCategories() using Revo Solo's product family endpoint
 * 3. Implement getProductsByCategory() using Revo Solo's product list endpoint
 * 4. Set CATALOG_PROVIDER=revo in .env
 */
export class RevoCatalogProvider implements CatalogProvider {
  async getCategories(): Promise<CatalogCategory[]> {
    throw new Error('RevoCatalogProvider not implemented. Set CATALOG_PROVIDER=mock in .env');
  }

  async getProductsByCategory(_categoryId: string): Promise<CatalogProduct[]> {
    throw new Error('RevoCatalogProvider not implemented. Set CATALOG_PROVIDER=mock in .env');
  }

  async getProductById(_productId: string): Promise<CatalogProduct | null> {
    throw new Error('RevoCatalogProvider not implemented. Set CATALOG_PROVIDER=mock in .env');
  }
}
