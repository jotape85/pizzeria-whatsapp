import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

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
        '❌ Pedido cancelado. ¡Cuando quieras volver a pedir, aquí estaremos! 🍕'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    await services.whatsapp.sendText(
      message.from,
      `⏳ Tu pedido está reservado y esperando el pago.\n\nUsa el link que te enviamos para completarlo — solo tarda un minuto 😊\n\nEscribe *"cancelar"* si quieres anular el pedido.`
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
        `🔐 *Tu link de pago seguro está listo:*\n\n` +
          `${result.url}\n\n` +
          `Es un pago 100% seguro y solo tardas un minuto en completarlo 😊\n` +
          `⏱️ El link es válido durante 30 minutos.\n\n` +
          `¡En cuanto confirmes el pago, ponemos tu pedido en marcha! 🍕`
      );
    } catch (error) {
      console.error('[Bot] Error generating payment link:', error);
      await services.whatsapp.sendText(
        to,
        `✅ Tu pedido *${orderNumber}* está confirmado. Nos ponemos en contacto contigo para gestionar el pago. ¡Gracias!`
      );
    }

    return { nextState: 'AWAITING_PAYMENT', context };
  }
}

export const awaitingPaymentHandler = new AwaitingPaymentHandler();
