const https = require('https');
const token = 'sbp_4552b6fbc9b93b8fab6c7a8aad25c744fd40869e';
const ref = 'ugsuwjlovcdblrfagewp';

const sql = `
-- ENUMS
DO $$ BEGIN CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE','IDLE','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Direction" AS ENUM ('INBOUND','OUTBOUND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MessageType" AS ENUM ('TEXT','IMAGE','AUDIO','VIDEO','DOCUMENT','INTERACTIVE_LIST','INTERACTIVE_BUTTON','TEMPLATE','UNKNOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MessageStatus" AS ENUM ('PENDING','SENT','DELIVERED','READ','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BotState" AS ENUM ('IDLE','GREETING','CATEGORY_SELECTION','PRODUCT_SELECTION','VARIANT_SELECTION','ADDING_NOTE','CART_REVIEW','CONFIRMING','AWAITING_PAYMENT','ORDER_COMPLETE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('DRAFT','CONFIRMED','AWAITING_PAYMENT','PAID','SENT_TO_KITCHEN','PREPARING','READY','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderType" AS ENUM ('PICKUP','DELIVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','LINK_SENT','PAID','FAILED','REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  "waNumberId" TEXT UNIQUE,
  address TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "botEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES customers(id),
  status "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_customer_idx ON conversations("customerId");

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES conversations(id),
  "waMessageId" TEXT UNIQUE,
  direction "Direction" NOT NULL,
  type "MessageType" NOT NULL DEFAULT 'TEXT',
  content TEXT NOT NULL,
  metadata JSONB,
  status "MessageStatus" NOT NULL DEFAULT 'SENT',
  "sentAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages("conversationId");

CREATE TABLE IF NOT EXISTS bot_sessions (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT UNIQUE NOT NULL REFERENCES conversations(id),
  "storeId" TEXT REFERENCES stores(id),
  state "BotState" NOT NULL DEFAULT 'IDLE',
  context JSONB NOT NULL DEFAULT '{}',
  "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  "customerId" TEXT UNIQUE NOT NULL REFERENCES customers(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  "categoryId" TEXT NOT NULL REFERENCES product_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  "basePrice" DECIMAL(10,2) NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "revoId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "priceAdjust" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "revoId" TEXT
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  "cartId" TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES products(id),
  "variantId" TEXT REFERENCES product_variants(id),
  quantity INT NOT NULL DEFAULT 1,
  note TEXT,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "customerId" TEXT NOT NULL REFERENCES customers(id),
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  status "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  type "OrderType" NOT NULL DEFAULT 'PICKUP',
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  "revoOrderId" TEXT,
  "paymentLink" TEXT,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "confirmedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders("customerId");
CREATE INDEX IF NOT EXISTS orders_store_idx ON orders("storeId");
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES orders(id),
  "productId" TEXT NOT NULL REFERENCES products(id),
  "variantId" TEXT REFERENCES product_variants(id),
  quantity INT NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS order_sequences (
  id INT PRIMARY KEY DEFAULT 1,
  year INT NOT NULL,
  "lastSeq" INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  "storeId" TEXT REFERENCES stores(id),
  source TEXT NOT NULL DEFAULT 'whatsapp',
  "eventType" TEXT,
  "waMessageId" TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON webhook_events("createdAt");
CREATE INDEX IF NOT EXISTS webhook_events_wamid_idx ON webhook_events("waMessageId");
`;

const body = JSON.stringify({ query: sql });
const options = {
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + ref + '/database/query',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 1000));
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
