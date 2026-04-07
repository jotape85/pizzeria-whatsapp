import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service';

/**
 * POST /api/payments/webhook
 *
 * Revo Xpress payment webhook — called by Revo when a payment is completed.
 *
 * Revo Xpress sends a signed POST with the payment result.
 * We validate the HMAC signature, find the order, mark it as paid,
 * and notify the customer via WhatsApp.
 *
 * Docs: https://developer.revo.works/xpress/webhooks
 * Set REVO_XPRESS_SECRET in .env — used to validate the webhook signature.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // ── Signature validation ─────────────────────────────────────────────────
  const secret = process.env.REVO_XPRESS_SECRET;
  if (secret) {
    const signature = request.headers.get('x-revo-signature') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (signature !== `sha256=${expected}`) {
      console.warn('[payment-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // ── Parse payload ────────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status, order_ref, payment_id } = payload as {
    status: string;
    order_ref: string;   // Our orderNumber e.g. "ORD-2026-0001"
    payment_id: string;  // Revo's internal payment ID
  };

  // Only process completed payments
  if (status !== 'PAID' && status !== 'paid' && status !== 'completed') {
    return NextResponse.json({ received: true, action: 'ignored', status });
  }

  // ── Find and update order ────────────────────────────────────────────────
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: order_ref },
        { id: order_ref },
      ],
    },
    include: { customer: true },
  });

  if (!order) {
    console.error(`[payment-webhook] Order not found: ${order_ref}`);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ received: true, action: 'already_paid' });
  }

  // Update order
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: 'SENT_TO_KITCHEN',   // TODO: trigger actual Revo Solo push
      completedAt: new Date(),
      revoOrderId: payment_id ?? null,
    },
  });

  // Update bot session to ORDER_COMPLETE
  const conversation = await prisma.conversation.findFirst({
    where: { customerId: order.customerId },
    include: { botSession: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (conversation?.botSession) {
    await prisma.botSession.update({
      where: { id: conversation.botSession.id },
      data: { state: 'ORDER_COMPLETE' },
    });
  }

  // Notify customer via WhatsApp
  const wa = new WhatsAppService();
  try {
    await wa.sendText(
      order.customer.phone,
      `🎉 ¡Pago confirmado! Tu pedido *${order.orderNumber}* está en preparación.\n\n` +
        `Te avisamos cuando esté listo para recoger. ¡Gracias! 🍕`
    );
  } catch (err) {
    console.error('[payment-webhook] Failed to send WA message:', err);
  }

  console.log(`[payment-webhook] Order ${order.orderNumber} marked as PAID (payment_id: ${payment_id})`);

  return NextResponse.json({ received: true, action: 'marked_paid', orderId: updated.id });
}
