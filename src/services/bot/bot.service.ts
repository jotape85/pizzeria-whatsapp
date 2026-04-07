import { prisma } from '@/lib/prisma';
import { getCatalogProvider, getOrderProvider, getPaymentProvider } from '@/services/provider.factory';
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service';
import type { IncomingMessage } from '@/types/bot';
import type { BotContext } from '@/types/bot';
import type { BotSession } from '@prisma/client';

import { idleHandler } from './handlers/idle.handler';
import { greetingHandler } from './handlers/greeting.handler';
import { categorySelectionHandler } from './handlers/category-selection.handler';
import { productSelectionHandler } from './handlers/product-selection.handler';
import { variantSelectionHandler } from './handlers/variant-selection.handler';
import { addingNoteHandler } from './handlers/adding-note.handler';
import { cartReviewHandler } from './handlers/cart-review.handler';
import { confirmingHandler } from './handlers/confirming.handler';
import { awaitingPaymentHandler } from './handlers/awaiting-payment.handler';
import { orderCompleteHandler } from './handlers/order-complete.handler';

// Session idle timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Bot orchestrator.
 *
 * Entry point for all inbound WhatsApp messages.
 * Loads the bot session, checks for timeout, delegates to the correct
 * state handler, and persists the updated session state.
 */
export class BotService {
  private readonly whatsapp: WhatsAppService;

  constructor() {
    this.whatsapp = new WhatsAppService();
  }

  async handleMessage(
    message: IncomingMessage,
    conversationId: string,
    storeId: string
  ): Promise<void> {
    const session = await this.getOrCreateSession(conversationId, storeId);
    const context = this.parseContext(session, storeId);

    // Check session timeout
    const timeSinceActivity = Date.now() - session.lastActivityAt.getTime();
    if (timeSinceActivity > SESSION_TIMEOUT_MS && session.state !== 'IDLE') {
      console.log(`[Bot] Session ${session.id} timed out. Resetting to IDLE.`);
      await this.updateSession(session.id, 'IDLE', context);
      // Re-handle as fresh IDLE session
      const freshSession = { ...session, state: 'IDLE' as const };
      return this.dispatch(message, freshSession, { storeId }, storeId);
    }

    return this.dispatch(message, session, context, storeId);
  }

  private async dispatch(
    message: IncomingMessage,
    session: BotSession,
    context: BotContext,
    storeId: string
  ): Promise<void> {
    const services = {
      whatsapp: this.whatsapp,
      catalog: getCatalogProvider(),
      order: getOrderProvider(),
      payment: getPaymentProvider(),
    };

    let result;

    try {
      switch (session.state) {
        case 'IDLE':
          result = await idleHandler.handle(message, session, context, services);
          break;
        case 'GREETING':
          result = await greetingHandler.handle(message, session, context, services);
          break;
        case 'CATEGORY_SELECTION':
          result = await categorySelectionHandler.handle(message, session, context, services);
          break;
        case 'PRODUCT_SELECTION':
          result = await productSelectionHandler.handle(message, session, context, services);
          break;
        case 'VARIANT_SELECTION':
          result = await variantSelectionHandler.handle(message, session, context, services);
          break;
        case 'ADDING_NOTE':
          result = await addingNoteHandler.handle(message, session, context, services);
          break;
        case 'CART_REVIEW':
          result = await cartReviewHandler.handle(message, session, context, services);
          break;
        case 'CONFIRMING':
          result = await confirmingHandler.handle(message, session, context, services);
          break;
        case 'AWAITING_PAYMENT':
          result = await awaitingPaymentHandler.handle(message, session, context, services);
          break;
        case 'ORDER_COMPLETE':
          result = await orderCompleteHandler.handle(message, session, context, services);
          break;
        default:
          result = await idleHandler.handle(message, session, context, services);
      }

      await this.updateSession(session.id, result.nextState, result.context);
    } catch (error) {
      console.error(`[Bot] Error in state ${session.state}:`, error);
      await this.whatsapp.sendText(
        message.from,
        '⚠️ Ha habido un problema. Por favor, escríbenos de nuevo para continuar.'
      );
      await this.updateSession(session.id, 'IDLE', { storeId });
    }
  }

  private async getOrCreateSession(conversationId: string, storeId: string): Promise<BotSession> {
    const existing = await prisma.botSession.findUnique({
      where: { conversationId },
    });

    if (existing) return existing;

    return prisma.botSession.create({
      data: {
        conversationId,
        storeId,
        state: 'IDLE',
        context: {},
        lastActivityAt: new Date(),
      },
    });
  }

  private parseContext(session: BotSession, storeId: string): BotContext {
    const raw = session.context as Record<string, unknown>;
    return {
      storeId: (raw.storeId as string) || storeId,
      selectedCategoryId: raw.selectedCategoryId as string | undefined,
      selectedProductId: raw.selectedProductId as string | undefined,
      selectedVariantId: raw.selectedVariantId as string | undefined,
      pendingCartItemProductId: raw.pendingCartItemProductId as string | undefined,
      cartId: raw.cartId as string | undefined,
      orderId: raw.orderId as string | undefined,
    };
  }

  private async updateSession(
    sessionId: string,
    state: BotSession['state'],
    context: BotContext
  ): Promise<void> {
    await prisma.botSession.update({
      where: { id: sessionId },
      data: {
        state,
        context: context as never,
        lastActivityAt: new Date(),
      },
    });
  }
}
