import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

/**
 * CONFIRMING state handler.
 *
 * Final confirmation before creating the order.
 * On "sí": creates the Order from the Cart, clears the cart, moves to AWAITING_PAYMENT.
 * On "no": returns to CART_REVIEW.
 */
export class ConfirmingHandler implements StateHandler {
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

    const isYes = ['1', 'si', 'sí', 'yes', 'confirmar', 'confirmo', 'adelante'].includes(input);
    const isNo = ['2', 'no', 'volver', 'cancelar'].includes(input);

    if (isYes) {
      return this.createOrderAndProceed(message.from, context, services);
    }

    if (isNo) {
      const { cartReviewHandler } = await import('./cart-review.handler');
      return cartReviewHandler.sendCartReview(message.from, context, services);
    }

    // Unclear — re-show confirmation
    return this.sendConfirmation(message.from, context, services);
  }

  async sendConfirmation(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    await services.whatsapp.sendButtons(to, {
      body:
        '📋 Confirma tu pedido:\n\n' +
        'Es *pedido para recoger* en tienda.\n\n' +
        '¿Confirmas el pedido y procedemos al pago?',
      buttons: [
        { id: '1', title: '✅ Sí, confirmar' },
        { id: '2', title: '✏️ No, modificar' },
      ],
    });

    return { nextState: 'CONFIRMING', context };
  }

  private async createOrderAndProceed(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    if (!context.cartId) {
      await services.whatsapp.sendText(to, '⚠️ No encontré tu carrito. Vamos a empezar de nuevo.');
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    const cart = await prisma.cart.findUnique({
      where: { id: context.cartId },
      include: {
        items: { include: { product: true, variant: true } },
        customer: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      await services.whatsapp.sendText(to, '⚠️ Tu carrito está vacío. Vamos a empezar de nuevo.');
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    const orderResult = await services.order.createOrder({
      storeId: context.storeId,
      customerId: cart.customer.id,
      items: cart.items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.variant?.id,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        note: item.note ?? undefined,
      })),
      total,
    });

    // Clear the cart after order creation
    await prisma.cartItem.deleteMany({ where: { cartId: context.cartId } });

    const newContext = { ...context, orderId: orderResult.orderId, cartId: undefined };

    await services.whatsapp.sendText(
      to,
      `✅ ¡Pedido *${orderResult.orderNumber}* creado!\n\nTotal: *${formatPrice(total)}*\n\nAhora generamos tu link de pago...`
    );

    const { awaitingPaymentHandler } = await import('./awaiting-payment.handler');
    return awaitingPaymentHandler.sendPaymentLink(to, newContext, cart.customer.phone, total, orderResult.orderNumber, services);
  }
}

export const confirmingHandler = new ConfirmingHandler();
