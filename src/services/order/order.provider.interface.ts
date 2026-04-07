export interface CreateOrderInput {
  storeId: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    note?: string;
  }>;
  total: number;
  notes?: string;
}

export interface OrderResult {
  orderId: string;
  orderNumber: string;
  externalId?: string; // Revo Solo order ID when available
}

export interface OrderProvider {
  createOrder(input: CreateOrderInput): Promise<OrderResult>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
  getOrder(orderId: string): Promise<unknown>;
}
