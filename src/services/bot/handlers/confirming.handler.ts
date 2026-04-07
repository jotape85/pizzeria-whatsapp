import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { formatPrice } from '@/lib/utils';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

/**
 * CONFIRMING state handler.
 *
 * Step 1 — Asks the customer to confirm the order (yes/no).
 * Step 2 — Asks for payment method (card / cash).
 *
 * Card  → generates payment link → AWAITING_PAYMENT
 * Cash  → confirms order directly → ORDER_COMPLETE (pays at pickup)
 * No    → returns to CART_REVIEW
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

    // ── Step 2: payment method selection ─────────────────────────────────────
    if (context.awaitingPaymentMethod) {
      return this.handlePaymentMethodChoice(input, message.from, context, services);
    }

    // ── Step 1: order confirmation ────────────────────────────────────────────
    const isYes = ['1', 'si', 'sí', 'yes', 'confirmar', 'confirmo', 'adelante'].includes(input);
    const isNo  = ['2', 'no', 'volver', 'cancelar'].includes(input);

    if (isYes) {
      return this.askPaymentMethod(message.from, context, services);
    }

    if (isNo) {
      const { cartReviewHandler } = await import('./cart-review.handler');
      return cartReviewHandler.sendCartReview(message.from, context, services);
    }

    // Unclear — re-show confirmation prompt
    return this.sendConfirmation(message.from, context, services);
  }

  // ── Public: called from cart-review when transitioning to CONFIRMING ─────────
  async sendConfirmation(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    await services.whatsapp.sendButtons(to, {
      body:
        '📋 *Confirma tu pedido*\n\n' +
        'Pedido para *recoger en tienda*.\n\n' +
        '¿Confirmas y procedemos al pago?',
      buttons: [
        { id: '1', title: '✅ Sí, confirmar' },
        { id: '2', title: '✏️ No, modificar' },
      ],
    });

    return { nextState: 'CONFIRMING', context: { ...context, awaitingPaymentMethod: false } };
  }

  // ── Step 2a: ask how they want to pay (or force card if above threshold) ────
  private async askPaymentMethod(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    // Calculate cart total to check against cash payment threshold
    const cartTotal = context.cartId
      ? await prisma.cartItem
          .findMany({ where: { cartId: context.cartId } })
          .then((items) => items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0))
      : 0;

    const maxCash = env.CASH_PAYMENT_MAX_AMOUNT;

    if (maxCash > 0 && cartTotal > maxCash) {
      // Force card payment — inform the customer why
      await services.whatsapp.sendText(
        to,
        `ℹ️ Para pedidos superiores a *${formatPrice(maxCash)}*, el pago online con tarjeta es obligatorio por seguridad.\n\nGenerando tu link de pago...`
      );
      return this.createOrderAndProceed(
        to,
        { ...context, paymentMethod: 'card', awaitingPaymentMethod: false },
        services
      );
    }

    // Below threshold — offer both options
    await services.whatsapp.sendButtons(to, {
      body: '💳 ¿Cómo quieres pagar tu pedido?',
      buttons: [
        { id: 'pay_card', title: '💳 Pagar con tarjeta' },
        { id: 'pay_cash', title: '💵 Efectivo al recoger' },
      ],
    });

    return {
      nextState: 'CONFIRMING',
      context: { ...context, awaitingPaymentMethod: true },
    };
  }

  // ── Step 2b: process payment method choice ────────────────────────────────────
  private async handlePaymentMethodChoice(
    input: string,
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const isCard = ['pay_card', '1', 'tarjeta', 'card', 'online'].includes(input);
    const isCash = ['pay_cash', '2', 'efectivo', 'cash', 'local'].includes(input);

    if (isCard) {
      return this.createOrderAndProceed(
        to,
        { ...context, paymentMethod: 'card', awaitingPaymentMethod: false },
        services
      );
    }

    if (isCash) {
      return this.createOrderAndProceed(
        to,
        { ...context, paymentMethod: 'cash', awaitingPaymentMethod: false },
        services
      );
    }

    // Unclear — re-ask
    await services.whatsapp.sendButtons(to, {
      body: '❓ Por favor elige cómo quieres pagar:',
      buttons: [
        { id: 'pay_card', title: '💳 Pagar con tarjeta' },
        { id: 'pay_cash', title: '💵 Efectivo al recoger' },
      ],
    });

    return { nextState: 'CONFIRMING', context };
  }

  // ── Create order in DB and branch by payment method ───────────────────────────
  private async createOrderAndProceed(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    if (!context.cartId) {
      await services.whatsapp.sendText(to, '⚠️ No encontré tu carrito. Empecemos de nuevo.');
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
      await services.whatsapp.sendText(to, '⚠️ Tu carrito está vacío. Empecemos de nuevo.');
      const { categorySelectionHandler } = await import('./category-selection.handler');
      return categorySelectionHandler.sendCategories(to, context, services);
    }

    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    const isCash = context.paymentMethod === 'cash';

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
      notes: isCash ? '💵 Pago en efectivo al recoger' : '💳 Pago con tarjeta (online)',
    });

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: context.cartId } });

    const newContext: BotContext = {
      ...context,
      orderId: orderResult.orderId,
      cartId: undefined,
      awaitingPaymentMethod: false,
    };

    // ── CASH: confirm directly, no payment link needed ──────────────────────
    if (isCash) {
      await prisma.order.update({
        where: { id: orderResult.orderId },
        data: { status: 'CONFIRMED', paymentStatus: 'PENDING' },
      });

      await services.whatsapp.sendText(
        to,
        `✅ ¡Pedido *${orderResult.orderNumber}* confirmado!\n\n` +
          `💵 *Pago en efectivo al recoger en tienda*\n` +
          `Total a pagar: *${formatPrice(total)}*\n\n` +
          `Te avisamos cuando esté listo. ¡Gracias! 🍕`
      );

      return { nextState: 'ORDER_COMPLETE', context: newContext };
    }

    // ── CARD: generate payment link and send it ─────────────────────────────
    await services.whatsapp.sendText(
      to,
      `✅ ¡Pedido *${orderResult.orderNumber}* creado!\n\nTotal: *${formatPrice(total)}*\n\nGenerando tu link de pago...`
    );

    const { awaitingPaymentHandler } = await import('./awaiting-payment.handler');
    return awaitingPaymentHandler.sendPaymentLink(
      to,
      newContext,
      cart.customer.phone,
      total,
      orderResult.orderNumber,
      services
    );
  }
}

export const confirmingHandler = new ConfirmingHandler();
