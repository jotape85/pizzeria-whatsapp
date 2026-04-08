import { formatPrice } from '@/lib/utils';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

export class VariantSelectionHandler implements StateHandler {
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

    if (input === '0' || input === 'volver' || input === 'atras' || input === 'atrás') {
      const { productSelectionHandler } = await import('./product-selection.handler');
      return productSelectionHandler.sendProducts(message.from, context, services);
    }

    if (!context.selectedProductId) {
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(message.from, context, services);
    }

    const product = await services.catalog.getProductById(context.selectedProductId);
    const variant = product?.variants.find((v) => v.id === input);

    if (variant) {
      const { addingNoteHandler } = await import('./adding-note.handler');
      return addingNoteHandler.askForNote(
        message.from,
        { ...context, selectedVariantId: variant.id },
        services
      );
    }

    return this.sendVariants(message.from, context, services);
  }

  async sendVariants(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const product = context.selectedProductId
      ? await services.catalog.getProductById(context.selectedProductId)
      : null;

    if (!product || product.variants.length === 0) {
      const { addingNoteHandler } = await import('./adding-note.handler');
      return addingNoteHandler.askForNote(to, context, services);
    }

    await services.whatsapp.sendList(to, {
      header: `🍕 ${product.name}`,
      body:
        `¡Buenísima elección! ¿Qué tamaño te viene mejor?\n\n` +
        `• Pequeña — perfecta para 1 persona\n` +
        `• Mediana — ideal para 1-2 personas\n` +
        `• Familiar — genial para compartir en grupo`,
      footer: 'Escribe "0" para volver',
      buttonText: 'Elegir tamaño',
      sections: [
        {
          title: 'Tamaños disponibles',
          rows: product.variants.map((v) => ({
            id: v.id,
            title: v.name,
            description: formatPrice(product.basePrice + v.priceAdjust),
          })),
        },
      ],
    });

    return { nextState: 'VARIANT_SELECTION', context };
  }
}

export const variantSelectionHandler = new VariantSelectionHandler();
