import { prisma } from '@/lib/prisma';
import type { CreateOrderInput, OrderProvider, OrderResult } from './order.provider.interface';

/**
 * Mock order provider — persists orders to local PostgreSQL.
 * Fully functional for MVP.
 *
 * TODO: After Revo Solo integration, this provider should also push the order
 * to Revo Solo via RevoCatalogProvider and store the returned revoOrderId.
 */
export class MockOrderProvider implements OrderProvider {
  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    // Generate order number in a transaction to avoid race conditions
    const result = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();

      const seq = await tx.orderSequence.upsert({
        where: { id: 1 },
        update: {
          lastSeq: {
            increment: 1,
          },
          year,
        },
        create: { id: 1, year, lastSeq: 1 },
      });

      // Reset sequence if year changed
      const actualSeq =
        seq.year !== year
          ? await tx.orderSequence
              .update({ where: { id: 1 }, data: { year, lastSeq: 1 } })
              .then((s) => s.lastSeq)
          : seq.lastSeq;

      const orderNumber = `ORD-${year}-${String(actualSeq).padStart(4, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: input.customerId,
          storeId: input.storeId,
          total: input.total,
          notes: input.notes,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
          confirmedAt: new Date(),
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              note: item.note ?? null,
            })),
          },
        },
      });

      return order;
    });

    return {
      orderId: result.id,
      orderNumber: result.orderNumber,
    };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as never, updatedAt: new Date() },
    });
  }

  async getOrder(orderId: string): Promise<unknown> {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, variant: true } }, customer: true },
    });
  }
}
