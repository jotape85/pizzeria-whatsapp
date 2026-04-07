import { prisma } from '@/lib/prisma';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

const STORE_NAME_FALLBACK = 'Pizzería';

/**
 * GREETING state handler.
 *
 * Sends the welcome message and waits for the customer to say "1" or "pedir".
 * Transition: GREETING → CATEGORY_SELECTION on valid trigger.
 */
export class GreetingHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const input = (message.text ?? message.interactiveReply?.id ?? '').toLowerCase().trim();

    if (input === '1' || input === 'pedir' || input === 'pedido' || input === 'quiero pedir') {
      // Move to category selection
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(message.from, context, services);
    }

    // Re-prompt the greeting
    await greetCustomer(message.from, context, services);
    return { nextState: 'GREETING', context };
  }
}

/**
 * Shared function used by both IdleHandler and GreetingHandler.
 * Sends the initial welcome message.
 */
export async function greetCustomer(
  to: string,
  context: BotContext,
  services: HandlerServices
): Promise<HandlerResult> {
  let storeName = STORE_NAME_FALLBACK;

  if (context.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: context.storeId },
      select: { name: true },
    });
    storeName = store?.name ?? STORE_NAME_FALLBACK;
  }

  await services.whatsapp.sendButtons(to, {
    body:
      `👋 ¡Hola! Soy el asistente de pedidos de *${storeName}*.\n\n` +
      `Te ayudo a hacer tu pedido para recoger. 🍕\n\n` +
      `¿Empezamos?`,
    buttons: [{ id: '1', title: '🛒 Hacer un pedido' }],
  });

  return { nextState: 'GREETING', context };
}

export const greetingHandler = new GreetingHandler();
