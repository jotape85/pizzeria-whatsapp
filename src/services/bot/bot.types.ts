import type { BotContext, BotState, HandlerResult, IncomingMessage } from '@/types/bot';
import type { BotSession } from '@prisma/client';
import type { WhatsAppService } from '@/services/whatsapp/whatsapp.service';
import type { CatalogProvider } from '@/services/catalog/catalog.provider.interface';
import type { OrderProvider } from '@/services/order/order.provider.interface';
import type { PaymentProvider } from '@/services/payment/payment.provider.interface';

export interface HandlerServices {
  whatsapp: WhatsAppService;
  catalog: CatalogProvider;
  order: OrderProvider;
  payment: PaymentProvider;
}

export interface StateHandler {
  handle(
    message: IncomingMessage,
    session: BotSession,
    context: BotContext,
    services: HandlerServices
  ): Promise<HandlerResult>;
}

export type { BotContext, BotState, HandlerResult, IncomingMessage };
