import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

/**
 * AWAITING_PAYMENT state handler.
 *
 * Sends the payment link and waits for confirmation.
 * Payment is confirmed either:
 *   a) By the payment provider webhook (future: Revo Xpress)
 *   b) Manually via admin panel "Marcar como pagado" button (MVP)
 *
 * On session timeout (30 min inactivity) the bot resets to IDLE in bot.service.ts.
 */
export class AwaitingPaymentHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const input = (message.text ?? '').toLowerCase().trim();

    if (input === 'cancelar' || input === 'cancel') {
      await services.whatsapp.sendText(
        message.from,
        '❌ Pedido cancelado. ¡Escríbenos cuando quieras!'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    // Any other message — remind customer about pending payment
    await services.whatsapp.sendText(
      message.from,
      `⏳ Tu pedido está pendiente de pago. Usa el link que te enviamos para completar la compra.\n\nEscribe "cancelar" si quieres anular el pedido.`
    );

    return { nextState: 'AWAITING_PAYMENT', context };
  }

  async sendPaymentLink(
    to: string,
    context: BotContext,
    customerPhone: string,
    total: number,
    orderNumber: string,
    services: HandlerServices
  ): Promise<HandlerResult> {
    if (!context.orderId) {
      return { nextState: 'AWAITING_PAYMENT', context };
    }

    try {
      const result = await services.payment.generatePaymentLink({
        orderId: context.orderId,
        orderNumber,
        amount: total,
        customerPhone,
        description: `Pedido ${orderNumber} - Pizzería`,
      });

      await services.whatsapp.sendText(
        to,
        `💳 *Link de pago para tu pedido ${orderNumber}:*\n\n${result.url}\n\n` +
          `⏱️ Este link expira en 30 minutos.\n\n` +
          `Una vez realizado el pago, recibirás la confirmación. ¡Gracias! 🍕`
      );
    } catch (error) {
      console.error('[Bot] Error generating payment link:', error);
      await services.whatsapp.sendText(
        to,
        `✅ Tu pedido *${orderNumber}* está confirmado. Te contactaremos para el pago. ¡Gracias!`
      );
    }

    return { nextState: 'AWAITING_PAYMENT', context };
  }
}

export const awaitingPaymentHandler = new AwaitingPaymentHandler();
