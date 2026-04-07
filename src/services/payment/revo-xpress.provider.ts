import https from 'https';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type {
  PaymentLinkInput,
  PaymentLinkResult,
  PaymentProvider,
  PaymentStatusResult,
} from './payment.provider.interface';

/**
 * Revo Xpress payment provider.
 *
 * Generates payment links via Revo Xpress API.
 * When the customer pays, Revo calls POST /api/payments/webhook.
 *
 * Required env vars:
 *   REVO_XPRESS_MERCHANT_ID   — Your Revo merchant ID
 *   REVO_XPRESS_SECRET        — Webhook + request signing secret
 *   REVO_XPRESS_API_URL       — API base URL (default: https://xpress.revo.works)
 *
 * Set PAYMENT_PROVIDER=revo-xpress in .env to activate.
 */
export class RevoExpressProvider implements PaymentProvider {
  private readonly merchantId: string;
  private readonly secret: string;
  private readonly apiUrl: string;

  constructor() {
    const merchantId = process.env.REVO_XPRESS_MERCHANT_ID;
    const secret = process.env.REVO_XPRESS_SECRET;

    if (!merchantId || !secret) {
      throw new Error(
        'RevoExpressProvider: missing REVO_XPRESS_MERCHANT_ID or REVO_XPRESS_SECRET env vars.'
      );
    }

    this.merchantId = merchantId;
    this.secret = secret;
    this.apiUrl = process.env.REVO_XPRESS_API_URL ?? 'https://xpress.revo.works';
  }

  async generatePaymentLink(input: PaymentLinkInput): Promise<PaymentLinkResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pizzeria-whatsapp.vercel.app';

    const body = JSON.stringify({
      merchant_id: this.merchantId,
      order_ref: input.orderNumber,
      amount: Math.round(input.amount * 100), // Revo expects cents
      currency: 'EUR',
      description: input.description,
      customer_phone: input.customerPhone,
      callback_url: `${appUrl}/api/payments/webhook`,
      success_url: `${appUrl}/mock-payment/${input.orderId}`,
      expires_in: 1800, // 30 minutes in seconds
    });

    const signature = this.sign(body);

    const result = await this.post<{
      payment_url: string;
      payment_id: string;
      expires_at: string;
    }>('/v1/payment-links', body, signature);

    // Store payment link in the order record
    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        paymentLink: result.payment_url,
        paymentStatus: 'LINK_SENT',
        status: 'AWAITING_PAYMENT',
        revoOrderId: result.payment_id,
      },
    });

    return {
      url: result.payment_url,
      externalPaymentId: result.payment_id,
      expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
    };
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { revoOrderId: true, paymentStatus: true, updatedAt: true },
    });

    if (!order?.revoOrderId) return { paid: false };

    try {
      const result = await this.get<{ status: string; paid_at?: string }>(
        `/v1/payment-links/${order.revoOrderId}`
      );
      const paid = result.status === 'PAID' || result.status === 'paid';
      return {
        paid,
        paidAt: paid && result.paid_at ? new Date(result.paid_at) : undefined,
      };
    } catch {
      return {
        paid: order.paymentStatus === 'PAID',
        paidAt: order.paymentStatus === 'PAID' ? order.updatedAt : undefined,
      };
    }
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private sign(body: string): string {
    return crypto.createHmac('sha256', this.secret).update(body).digest('hex');
  }

  private post<T>(path: string, body: string, signature: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Revo-Signature': `sha256=${signature}`,
          'X-Revo-Merchant': this.merchantId,
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Revo Xpress ${res.statusCode}: ${data}`));
          } else {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error(`Invalid JSON: ${data}`)); }
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private get<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'GET',
        headers: { 'X-Revo-Merchant': this.merchantId },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Revo Xpress ${res.statusCode}: ${data}`));
          } else {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error(`Invalid JSON: ${data}`)); }
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }
}
