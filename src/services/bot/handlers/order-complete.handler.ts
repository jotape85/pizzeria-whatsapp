import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';
import { greetCustomer } from './greeting.handler';

export class OrderCompleteHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    // Any new message after a completed order starts a fresh order
    const freshContext: BotContext = { storeId: context.storeId };
    await services.whatsapp.sendText(
      message.from,
      `¡Hola de nuevo! 🎉 Qué alegría verte otra vez por aquí.\n\n¿Otro pedido increíble? ¡Vamos a ello!`
    );
    return greetCustomer(message.from, freshContext, services);
  }
}

export const orderCompleteHandler = new OrderCompleteHandler();
