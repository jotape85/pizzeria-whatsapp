import { prisma } from '@/lib/prisma';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

const SKIP_KEYWORDS = ['no', 'nada', 'sin nota', 'skip', 'ninguna', 'ninguno'];

/**
 * ADDING_NOTE state handler.
 *
 * Asks the customer for an optional note on the current item (e.g. "sin cebolla").
 * Any message is treated as the note. Keywords like "no" skip the note.
 * Then adds the CartItem to the database and transitions to CART_REVIEW.
 *
 * Transition: → CART_REVIEW (always, after saving the cart item)
 */
export class AddingNoteHandler implements StateHandler {
  async handle(
    message: IncomingMessage,
    _session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const input = (message.text ?? '').trim();
    const isSkip = SKIP_KEYWORDS.includes(input.toLowerCase());
    const note = isSkip ? undefined : input || undefined;

    const newContext = await addCartItem(message.from, context, note, services);

    const { cartReviewHandler } = await import('./cart-review.handler');
    return cartReviewHandler.sendCartReview(message.from, newContext, services);
  }

  async askForNote(
    to: string,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult> {
    const product = context.selectedProductId
      ? await services.catalog.getProductById(context.selectedProductId)
      : null;

    const productName = product?.name ?? 'el producto';

    await services.whatsapp.sendButtons(to, {
      body: `✏️ ¿Quieres añadir alguna nota para *${productName}*?\n\nEj: sin cebolla, extra picante, bien hecho...\n\nO pulsa "Sin nota" para continuar.`,
      buttons: [{ id: 'no', title: '✓ Sin nota' }],
    });

    return { nextState: 'ADDING_NOTE', context };
  }
}

/**
 * Adds or finds the customer's Cart, then creates a CartItem.
 * Returns updated context with cartId.
 */
async function addCartItem(
  _phone: string,
  context: BotContext,
  note: string | undefined,
  services: HandlerServices
): Promise<BotContext> {
  if (!context.selectedProductId) return context;

  const product = await services.catalog.getProductById(context.selectedProductId);
  if (!product) return context;

  const variant = context.selectedVariantId
    ? product.variants.find((v) => v.id === context.selectedVariantId)
    : undefined;

  const unitPrice = product.basePrice + (variant?.priceAdjust ?? 0);

  // Find the customer by their session (we need customerId for the cart)
  // The customer is resolved from the conversation → botSession chain
  // We find the cart via the customerId stored in the bot session's conversation
  const session = await prisma.botSession.findUnique({
    where: { id: context.storeId }, // storeId is used as session lookup key here — see bot.service.ts
    include: { conversation: { include: { customer: true } } },
  });

  // Get customer via conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      botSession: {
        storeId: context.storeId,
      },
    },
    include: { customer: true },
    orderBy: { updatedAt: 'desc' },
  });

  // If we have a cartId in context, use it; otherwise find/create cart for customer
  let cartId = context.cartId;

  if (!cartId && conversation?.customer) {
    const cart = await prisma.cart.upsert({
      where: { customerId: conversation.customer.id },
      update: {},
      create: { customerId: conversation.customer.id },
    });
    cartId = cart.id;
  }

  if (!cartId) return context;

  await prisma.cartItem.create({
    data: {
      cartId,
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: 1,
      unitPrice,
      note: note ?? null,
    },
  });

  return {
    ...context,
    cartId,
    selectedProductId: undefined,
    selectedVariantId: undefined,
    pendingCartItemProductId: undefined,
  };
}

export const addingNoteHandler = new AddingNoteHandler();
