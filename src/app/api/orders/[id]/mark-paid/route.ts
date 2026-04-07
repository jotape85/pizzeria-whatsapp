import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service';

/**
 * POST /api/orders/[id]/mark-paid
 *
 * Admin action to manually confirm payment during MVP testing.
 * Simulates what will eventually be triggered by the Revo Xpress payment webhook.
 *
 * TODO: Remove this endpoint (or make it admin-only) when real payment webhooks are active.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
  }

  // Update order status
  const updated = await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: 'PAID',
      status: 'SENT_TO_KITCHEN',  // TODO: trigger actual Revo Solo push here
      completedAt: new Date(),
    },
  });

  // Update the bot session to ORDER_COMPLETE so the customer gets the right response
  const conversation = await prisma.conversation.findFirst({
    where: { customer: { id: order.customerId } },
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
  } catch (error) {
    console.error('[mark-paid] Failed to send confirmation message:', error);
  }

  return NextResponse.json({ success: true, order: updated });
}
