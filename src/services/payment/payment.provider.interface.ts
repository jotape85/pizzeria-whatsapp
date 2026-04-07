export interface PaymentLinkInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerPhone: string;
  description: string; // e.g. "Pedido ORD-2024-0001 - Pizzería Central"
}

export interface PaymentLinkResult {
  url: string;
  expiresAt?: Date;
  externalPaymentId?: string;
}

export interface PaymentStatusResult {
  paid: boolean;
  paidAt?: Date;
}

export interface PaymentProvider {
  generatePaymentLink(input: PaymentLinkInput): Promise<PaymentLinkResult>;
  checkPaymentStatus(orderId: string): Promise<PaymentStatusResult>;
}
