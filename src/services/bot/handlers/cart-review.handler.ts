import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

/**
 * CART_REVIEW state handler.
 *
 * Shows the current cart contents and total.
 * Transitions:
 *   → CONFIRMING on "1" / confirmar
 *   → CATEGORY_SELECTION on "2" / agregar más
 *   → IDLE on "3" / vaciar carrito
 */
export class CartReviewHandler implements StateHandler {
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

    switch (input) {
      case '1':
      case 'confirmar':
      case 'confirmo': {
        const { confirmingHandler } = await import('./confirming.handler');
        return confirmingHandler.sendConfirmation(message.from, context, services);
      }

      case '2':
      case 'agregar':
      case 'agregar más':
      case 'añadir': {
        const { categorySelectionHandler } = await import('./category-selection.handler');
        return categorySelectionHandler.sendCategories(message.from, context, services);
      }

      case '3':
      case 'vaciar':
      case 'vaciar carrito':
      case 'cancelar': {
        await clearCart(context);
        await services.whatsapp.sendText(
          message.from,
          '🗑️ Carrito vaciado. ¡Escríbenos cuando quieras hacer un pedido!'
        );
        return { nextState: 'IDLE', context: { storeId: context.storeId } };
      }

      default:
        return this.sendCartReview(message.from, context, services);
    }
  }

  async sendCartReview(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    if (!context.cartId) {
      // Cart not in context — try to find it from the customer
      const { categorySelectionHandler } = await import('./category-selection.handler');
      await services.whatsapp.sendText(
        to,
        '🛒 Tu carrito está vacío. Elige algo del menú:'
      );
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    const cart = await prisma.cart.findUnique({
      where: { id: context.cartId },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      const { categorySelectionHandler } = await import('./category-selection.handler');
      await services.whatsapp.sendText(to, '🛒 Tu carrito está vacío. Elige algo del menú:');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    // Build cart summary text
    let summary = '🛒 *Tu pedido:*\n\n';
    let total = 0;

    cart.items.forEach((item, i) => {
      const variantName = item.variant ? ` (${item.variant.name})` : '';
      const itemTotal = Number(item.unitPrice) * item.quantity;
      total += itemTotal;

      summary += `${i + 1}. *${item.product.name}*${variantName}\n`;
      summary += `   ${formatPrice(itemTotal)}`;
      if (item.note) summary += `  _(${item.note})_`;
      summary += '\n';
    });

    summary += `\n💰 *Total: ${formatPrice(total)}*\n\n¿Qué hacemos?`;

    await services.whatsapp.sendButtons(to, {
      body: summary,
      buttons: [
        { id: '1', title: '✅ Confirmar pedido' },
        { id: '2', title: '➕ Añadir más' },
        { id: '3', title: '🗑️ Vaciar carrito' },
      ],
    });

    return { nextState: 'CART_REVIEW', context };
  }
}

async function clearCart(context: BotContext): Promise<void> {
  if (!context.cartId) return;
  await prisma.cartItem.deleteMany({ where: { cartId: context.cartId } });
}

export const cartReviewHandler = new CartReviewHandler();
