import { formatPrice } from '@/lib/utils';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

export class ProductSelectionHandler implements StateHandler {
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
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(message.from, context, services);
    }

    if (input === 'carrito' || input === 'ver carrito') {
      const { cartReviewHandler } = await import('./cart-review.handler');
      return cartReviewHandler.sendCartReview(message.from, context, services);
    }

    const product = await services.catalog.getProductById(input);

    if (product) {
      const newContext = { ...context, selectedProductId: product.id, pendingCartItemProductId: product.id };

      if (product.variants.length > 0) {
        const { variantSelectionHandler } = await import('./variant-selection.handler');
        return variantSelectionHandler.sendVariants(message.from, newContext, services);
      }

      const { addingNoteHandler } = await import('./adding-note.handler');
      return addingNoteHandler.askForNote(message.from, { ...newContext, selectedVariantId: undefined }, services);
    }

    if (!context.selectedCategoryId) {
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(message.from, context, services);
    }

    return this.sendProducts(message.from, context, services);
  }

  async sendProducts(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    if (!context.selectedCategoryId) {
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    const products = await services.catalog.getProductsByCategory(context.selectedCategoryId);

    if (products.length === 0) {
      await services.whatsapp.sendText(
        to,
        '😔 Esta sección está agotada por hoy. Prueba con otra categoría:'
      );
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    await services.whatsapp.sendList(to, {
      header: '✨ Elige tu producto',
      body: '¡Todos están buenísimos! ¿Cuál te llama la atención?',
      footer: 'Escribe "0" para volver | "carrito" para revisar tu pedido',
      buttonText: 'Ver productos',
      sections: [
        {
          title: 'Disponibles hoy',
          rows: products.map((p) => ({
            id: p.id,
            title: p.name,
            description: `${formatPrice(p.basePrice)}${p.description ? ` — ${p.description}` : ''}`,
          })),
        },
      ],
    });

    return { nextState: 'PRODUCT_SELECTION', context };
  }
}

export const productSelectionHandler = new ProductSelectionHandler();
