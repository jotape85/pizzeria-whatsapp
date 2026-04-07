import type { CreateOrderInput, OrderProvider, OrderResult } from './order.provider.interface';

/**
 * Revo Solo order provider — stub for future implementation.
 *
 * TODO: Implement using Revo Solo REST API.
 *
 * When implemented, this provider should:
 * 1. POST the order to Revo Solo's order endpoint
 * 2. Revo Solo will forward it to Revo XEF which shows it on the KDS
 * 3. Store the returned Revo order ID in order.revoOrderId
 * 4. Poll or listen for status updates from Revo (webhook or polling)
 *
 * Set ORDER_PROVIDER=revo in .env to activate.
 */
export class RevoOrderProvider implements OrderProvider {
  async createOrder(_input: CreateOrderInput): Promise<OrderResult> {
    throw new Error('RevoOrderProvider not implemented. Set ORDER_PROVIDER=mock in .env');
  }

  async updateOrderStatus(_orderId: string, _status: string): Promise<void> {
    throw new Error('RevoOrderProvider not implemented.');
  }

  async getOrder(_orderId: string): Promise<unknown> {
    throw new Error('RevoOrderProvider not implemented.');
  }
}
