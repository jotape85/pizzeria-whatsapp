import { prisma } from '@/lib/prisma';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

const STORE_NAME_FALLBACK = 'Pizzería';

export class GreetingHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const input = (message.text ?? message.interactiveReply?.id ?? '').toLowerCase().trim();

    if (input === '1' || input === 'pedir' || input === 'pedido' || input === 'quiero pedir') {
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(message.from, context, services);
    }

    await greetCustomer(message.from, context, services);
    return { nextState: 'GREETING', context };
  }
}

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
      `👋 ¡Hola! Bienvenido/a a *${storeName}* 🍕\n\n` +
      `Aquí elaboramos nuestras pizzas con masa fresca artesanal y los mejores ingredientes cada día. ¡Estás en el lugar perfecto!\n\n` +
      `Soy tu asistente personal y estoy aquí para ayudarte a elegir la combinación perfecta. ¿Empezamos?`,
    buttons: [{ id: '1', title: '🛒 ¡Quiero pedir!' }],
  });

  return { nextState: 'GREETING', context };
}

export const greetingHandler = new GreetingHandler();
