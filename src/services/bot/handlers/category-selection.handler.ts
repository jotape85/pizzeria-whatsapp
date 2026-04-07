import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

/**
 * CATEGORY_SELECTION state handler.
 *
 * Shows the list of active product categories.
 * Transitions:
 *   → PRODUCT_SELECTION on valid category selection
 *   → IDLE on "0" / "cancelar"
 */
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
        '✅ Pedido cancelado. ¡Hasta pronto! Escríbenos cuando quieras pedir.'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    // Check if the input matches a known category ID (from interactive reply)
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

    // Input not recognized — re-send categories
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
        '⚠️ No hay categorías disponibles en este momento. Por favor, inténtalo más tarde.'
      );
      return { nextState: 'IDLE', context: { storeId: context.storeId } };
    }

    await services.whatsapp.sendList(to, {
      header: '📋 Nuestro menú',
      body: '¿Qué te apetece hoy? Elige una categoría:',
      footer: 'Escribe "0" para cancelar',
      buttonText: 'Ver categorías',
      sections: [
        {
          title: 'Categorías',
          rows: categories.map((c) => ({
            id: c.id,
            title: `${c.emoji ?? ''} ${c.name}`.trim(),
            description: c.description,
          })),
        },
      ],
    });

    return { nextState: 'CATEGORY_SELECTION', context };
  }
}

export const categorySelectionHandler = new CategorySelectionHandler();
