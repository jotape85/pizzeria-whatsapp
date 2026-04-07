import type { PaymentLinkInput, PaymentLinkResult, PaymentProvider, PaymentStatusResult } from './payment.provider.interface';

/**
 * Revo Xpress payment provider — stub for future implementation.
 *
 * TODO: Implement using Revo Xpress payment API.
 *
 * When implemented, this provider should:
 * 1. Call Revo Xpress API to generate a payment link for the order amount
 * 2. Return the payment URL to be sent to the customer via WhatsApp
 * 3. Listen for Revo Xpress payment webhooks to confirm payment
 * 4. Update order.paymentStatus to PAID when confirmed
 *
 * Required env vars: REVO_XPRESS_MERCHANT_ID, REVO_XPRESS_SECRET
 * Set PAYMENT_PROVIDER=revo-xpress in .env to activate.
 */
export class RevoExpressProvider implements PaymentProvider {
  async generatePaymentLink(_input: PaymentLinkInput): Promise<PaymentLinkResult> {
    throw new Error('RevoExpressProvider not implemented. Set PAYMENT_PROVIDER=mock in .env');
  }

  async checkPaymentStatus(_orderId: string): Promise<PaymentStatusResult> {
    throw new Error('RevoExpressProvider not implemented.');
  }
}
