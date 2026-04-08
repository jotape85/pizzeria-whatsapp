import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

export class CategorySelectionHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const input = (
      message.interactiveReply?.id ??
      message.text ??
      ''
    ).toLowerCase().trim();

    if (input === '0' || input === 'cancelar' || input === 'salir') {
      await services.whatsapp.sendText(
        message.from,
        '👋 ¡Sin problema! Cuando quieras pedir, aquí estaremos. ¡Hasta pronto!'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    const categories = await services.catalog.getCategories();
    const selectedCategory = categories.find((c) => c.id === input);

    if (selectedCategory) {
      const { productSelectionHandler } = await import('./product-selection.handler');
      return productSelectionHandler.sendProducts(
        message.from,
        { ...context, selectedCategoryId: selectedCategory.id },
        services
      );
    }

    return this.sendCategories(message.from, context, services);
  }

  async sendCategories(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const categories = await services.catalog.getCategories();

    if (categories.length === 0) {
      await services.whatsapp.sendText(
        to,
        '⚠️ La carta no está disponible ahora mismo. ¡Inténtalo de nuevo en unos minutos!'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    await services.whatsapp.sendList(to, {
      header: '🍕 Nuestra carta',
      body: '¡Todo recién preparado! ¿Por qué sección empezamos?',
      footer: 'Escribe "0" si necesitas cancelar',
      buttonText: 'Ver la carta',
      sections: [
        {
          title: 'Elige una sección',
          rows: categories.map((c) => ({
            id: c.id,
            title: `${c.emoji ?? ''} ${c.name}`.trim(),
            description: c.description ?? undefined,
          })),
        },
      ],
    });

    return { nextState: 'CATEGORY_SELECTION', context };
  }
}

export const categorySelectionHandler = new CategorySelectionHandler();
