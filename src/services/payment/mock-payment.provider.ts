import { prisma } from '@/lib/prisma';
import type { PaymentLinkInput, PaymentLinkResult, PaymentProvider, PaymentStatusResult } from './payment.provider.interface';

/**
 * Mock payment provider — generates a fake payment URL.
 *
 * The admin panel's "/orders" page has a "Marcar como pagado" button
 * that manually triggers payment confirmation during MVP testing.
 *
 * TODO: Replace with RevoExpressProvider when Revo Xpress credentials
 * are available. Set PAYMENT_PROVIDER=revo-xpress in .env to activate.
 */
export class MockPaymentProvider implements PaymentProvider {
  async generatePaymentLink(input: PaymentLinkInput): Promise<PaymentLinkResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const url = `${appUrl}/mock-payment/${input.orderId}?amount=${input.amount}&order=${input.orderNumber}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store the payment link in the order record
    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentLink: url,
        paymentStatus: 'LINK_SENT',
        status: 'AWAITING_PAYMENT',
      },
    });

    return { url, expiresAt };
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, updatedAt: true },
    });

    if (!order) return { paid: false };

    return {
      paid: order.paymentStatus === 'PAID',
      paidAt: order.paymentStatus === 'PAID' ? order.updatedAt : undefined,
    };
  }
}
