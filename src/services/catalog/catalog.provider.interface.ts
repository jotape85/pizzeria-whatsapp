export interface CatalogCategory {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  sortOrder: number;
}

export interface CatalogVariant {
  id: string;
  name: string;
  priceAdjust: number;
  sortOrder: number;
}

export interface CatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  variants: CatalogVariant[];
}

export interface CatalogProvider {
  getCategories(): Promise<CatalogCategory[]>;
  getProductsByCategory(categoryId: string): Promise<CatalogProduct[]>;
  getProductById(productId: string): Promise<CatalogProduct | null>;
}
