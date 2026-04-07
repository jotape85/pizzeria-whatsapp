import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';
import { greetCustomer } from './greeting.handler';

/**
 * IDLE → GREETING
 * Any message received in idle state triggers a greeting.
 */
export class IdleHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    // Delegate immediately to greeting so customer gets a response in the same turn
    return greetCustomer(message.from, context, services);
  }
}

export const idleHandler = new IdleHandler();
