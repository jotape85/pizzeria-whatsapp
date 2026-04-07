export type BotState =
  | 'IDLE'
  | 'GREETING'
  | 'CATEGORY_SELECTION'
  | 'PRODUCT_SELECTION'
  | 'VARIANT_SELECTION'
  | 'ADDING_NOTE'
  | 'CART_REVIEW'
  | 'CONFIRMING'
  | 'AWAITING_PAYMENT'
  | 'ORDER_COMPLETE';

export interface BotContext {
  storeId: string;
  selectedCategoryId?: string;
  selectedProductId?: string;
  selectedVariantId?: string;
  pendingCartItemProductId?: string;
  cartId?: string;
  orderId?: string;
  // Payment flow
  awaitingPaymentMethod?: boolean;   // true after order confirmed, waiting for card/cash choice
  paymentMethod?: 'card' | 'cash';   // chosen payment method
}

export interface IncomingMessage {
  from: string;         // E.164 phone number
  waMessageId: string;
  type: 'text' | 'interactive' | 'image' | 'audio' | 'video' | 'document' | 'unknown';
  text?: string;
  interactiveReply?: {
    type: 'list_reply' | 'button_reply';
    id: string;
    title: string;
  };
  timestamp: string;
}

export interface HandlerResult {
  nextState: BotState;
  context: BotContext;
}
