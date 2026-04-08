import { prisma } from '@/lib/prisma';
import type { BotContext, HandlerResult, IncomingMessage, HandlerServices, StateHandler } from '../bot.types';
import type { BotSession } from '@prisma/client';

const SKIP_KEYWORDS = ['no', 'nada', 'sin nota', 'skip', 'ninguna', 'ninguno'];

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

    const newContext = await addCartItem(context, note, services);

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
      body:
        `¡Perfecto! 🍕 *${productName}* va al carrito.\n\n` +
        `¿Quieres que el chef tenga alguna indicación especial?\n` +
        `_Ej: sin cebolla, extra queso, bien hecha, masa fina..._\n\n` +
        `Si la quieres tal cual, ¡también está deliciosa así!`,
      buttons: [{ id: 'no', title: '✓ Sin personalizar' }],
    });

    return { nextState: 'ADDING_NOTE', context };
  }
}

async function addCartItem(
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

  let cartId = context.cartId;

  if (!cartId) {
    const conversation = await prisma.conversation.findFirst({
      where: { botSession: { storeId: context.storeId } },
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversation?.customer) {
      const cart = await prisma.cart.upsert({
        where: { customerId: conversation.customer.id },
        update: {},
        create: { customerId: conversation.customer.id },
      });
      cartId = cart.id;
    }
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
