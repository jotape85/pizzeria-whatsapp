import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';
import { greetCustomer } from './greeting.handler';

/**
 * ORDER_COMPLETE state handler.
 *
 * Order has been paid and confirmed. Any new message starts a new order flow.
 * Transition: → GREETING (immediately, for new order)
 *
 * TODO: When Revo Solo integration is active, also push the order to Revo Solo
 * here (or in the payment confirmation webhook handler) so it appears in Revo XEF KDS.
 */
export class OrderCompleteHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    // Start fresh for a new order
    const freshContext: BotContext = { storeId: context.storeId };
    return greetCustomer(message.from, freshContext, services);
  }
}

export const orderCompleteHandler = new OrderCompleteHandler();
