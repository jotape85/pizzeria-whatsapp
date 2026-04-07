import type { CatalogProvider } from './catalog/catalog.provider.interface';
import type { OrderProvider } from './order/order.provider.interface';
import type { PaymentProvider } from './payment/payment.provider.interface';

/** Returns the active CatalogProvider based on CATALOG_PROVIDER env var */
export function getCatalogProvider(): CatalogProvider {
  const provider = process.env.CATALOG_PROVIDER ?? 'mock';

  if (provider === 'revo') {
    const { RevoCatalogProvider } = require('./catalog/revo-catalog.provider');
    return new RevoCatalogProvider();
  }

  const { MockCatalogProvider } = require('./catalog/mock-catalog.provider');
  return new MockCatalogProvider();
}

/** Returns the active OrderProvider based on ORDER_PROVIDER env var */
export function getOrderProvider(): OrderProvider {
  const provider = process.env.ORDER_PROVIDER ?? 'mock';

  if (provider === 'revo') {
    const { RevoOrderProvider } = require('./order/revo-order.provider');
    return new RevoOrderProvider();
  }

  const { MockOrderProvider } = require('./order/mock-order.provider');
  return new MockOrderProvider();
}

/** Returns the active PaymentProvider based on PAYMENT_PROVIDER env var */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? 'mock';

  if (provider === 'revo-xpress') {
    const { RevoExpressProvider } = require('./payment/revo-xpress.provider');
    return new RevoExpressProvider();
  }

  const { MockPaymentProvider } = require('./payment/mock-payment.provider');
  return new MockPaymentProvider();
}
