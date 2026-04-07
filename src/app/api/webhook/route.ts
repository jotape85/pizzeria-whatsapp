import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseWebhookPayload } from '@/services/whatsapp/whatsapp.parser';
import { BotService } from '@/services/bot/bot.service';
import type { WhatsAppWebhookPayload } from '@/types/whatsapp';

// ─── GET — Webhook Verification ──────────────────────────────────────────────

/**
 * Meta calls this endpoint once when you configure the webhook in the
 * Meta Developer Console. Must return hub.challenge as plain text.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Webhook] Verification failed — token mismatch or wrong mode');
  return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST — Receive Messages ──────────────────────────────────────────────────

/**
 * All WhatsApp events (messages, status updates, etc.) arrive here.
 *
 * Pipeline:
 * 1. Read raw body (needed for HMAC validation)
 * 2. Validate X-Hub-Signature-256
 * 3. Log raw event to WebhookEvent table
 * 4. Parse payload
 * 5. Find or create Customer
 * 6. Find or create Conversation
 * 7. Persist inbound Message
 * 8. Dispatch to BotService
 * 9. Return 200 immediately (WA requires response within 15 seconds)
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body as text (must happen before any JSON parsing for HMAC)
  const rawBody = await request.text();

  // 2. Validate signature
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  if (!validateSignature(rawBody, signature)) {
    console.warn('[Webhook] Invalid signature — possible spoofed request');
    return new NextResponse('Forbidden', { status: 403 });
  }

  let body: WhatsAppWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('[Webhook] Invalid JSON body');
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Only handle whatsapp_business_account events
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ok' });
  }

  // 3. Parse the payload
  const parsed = parseWebhookPayload(body);

  // 4. Log raw event to DB (always, even if processing fails)
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      source: 'whatsapp',
      payload: body as never,
      processed: false,
    },
  });

  // 5. Handle status updates (delivery receipts)
  if (parsed.statuses.length > 0) {
    await handleStatusUpdates(parsed.statuses);
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { eventType: 'statuses', processed: true },
    });
    return NextResponse.json({ status: 'ok' });
  }

  // 6. Handle inbound messages
  if (parsed.messages.length === 0) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { eventType: 'unknown', processed: true },
    });
    return NextResponse.json({ status: 'ok' });
  }

  // Update event type
  await prisma.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: { eventType: 'messages', waMessageId: parsed.messages[0]?.waMessageId },
  });

  // Find the store by phone number ID
  const storeId = await resolveStoreId(parsed.phoneNumberId);

  const botService = new BotService();

  for (const incomingMsg of parsed.messages) {
    try {
      // Find or create the customer
      const contactName = parsed.contacts.find((c) => c.phone === incomingMsg.from)?.name;
      const customer = await prisma.customer.upsert({
        where: { phone: incomingMsg.from },
        update: { name: contactName ?? undefined },
        create: { phone: incomingMsg.from, name: contactName ?? null },
      });

      // Find or create active conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          // Use a custom unique constraint on customerId + status for "active" convs
          // For simplicity at MVP we find the most recent active one
          id: await getOrCreateConversationId(customer.id),
        },
        update: { updatedAt: new Date() },
        create: {
          customerId: customer.id,
          status: 'ACTIVE',
        },
      });

      // Persist inbound message
      await prisma.message.upsert({
        where: { waMessageId: incomingMsg.waMessageId },
        update: {},
        create: {
          conversationId: conversation.id,
          waMessageId: incomingMsg.waMessageId,
          direction: 'INBOUND',
          type: mapMessageType(incomingMsg.type),
          content: incomingMsg.text ?? incomingMsg.interactiveReply?.title ?? `[${incomingMsg.type}]`,
          metadata: incomingMsg.interactiveReply ? (incomingMsg.interactiveReply as never) : undefined,
          sentAt: new Date(parseInt(incomingMsg.timestamp) * 1000),
          status: 'DELIVERED',
        },
      });

      // Mark as read
      try {
        const { WhatsAppService } = await import('@/services/whatsapp/whatsapp.service');
        const wa = new WhatsAppService();
        await wa.markAsRead(incomingMsg.waMessageId);
      } catch {
        // Non-critical — don't fail the whole pipeline
      }

      // Dispatch to bot
      await botService.handleMessage(incomingMsg, conversation.id, storeId);

      // Mark webhook event as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { storeId: storeId || null, processed: true },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[Webhook] Error processing message:', errMsg);
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { error: errMsg },
      });
    }
  }

  // Always return 200 — WhatsApp will retry if it doesn't receive 200
  return NextResponse.json({ status: 'ok' });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function validateSignature(rawBody: string, signatureHeader: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // If no secret configured (dev mode), skip validation
  if (!appSecret) {
    console.warn('[Webhook] WHATSAPP_APP_SECRET not set — skipping signature validation');
    return true;
  }

  if (!signatureHeader.startsWith('sha256=')) return false;

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const receivedSignature = signatureHeader.slice('sha256='.length);

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

async function resolveStoreId(phoneNumberId: string): Promise<string> {
  const store = await prisma.store.findFirst({
    where: { waNumberId: phoneNumberId },
    select: { id: true },
  });

  if (store) return store.id;

  // Fallback to default store
  const defaultStoreId = process.env.DEFAULT_STORE_ID;
  if (defaultStoreId) return defaultStoreId;

  // Last resort: first active store
  const firstStore = await prisma.store.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return firstStore?.id ?? '';
}

async function getOrCreateConversationId(customerId: string): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: { customerId, status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.conversation.create({
    data: { customerId, status: 'ACTIVE' },
    select: { id: true },
  });

  return created.id;
}

async function handleStatusUpdates(
  statuses: Array<{ id: string; status: string; timestamp: string }>
): Promise<void> {
  for (const status of statuses) {
    const messageStatus = mapDeliveryStatus(status.status);
    await prisma.message.updateMany({
      where: { waMessageId: status.id },
      data: {
        status: messageStatus,
        ...(messageStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(messageStatus === 'READ' ? { readAt: new Date() } : {}),
      },
    });
  }
}

function mapDeliveryStatus(status: string): 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
  switch (status) {
    case 'sent': return 'SENT';
    case 'delivered': return 'DELIVERED';
    case 'read': return 'READ';
    case 'failed': return 'FAILED';
    default: return 'SENT';
  }
}

function mapMessageType(
  type: string
): 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'INTERACTIVE_LIST' | 'INTERACTIVE_BUTTON' | 'TEMPLATE' | 'UNKNOWN' {
  switch (type) {
    case 'text': return 'TEXT';
    case 'interactive': return 'INTERACTIVE_BUTTON';
    case 'image': return 'IMAGE';
    case 'audio': return 'AUDIO';
    case 'video': return 'VIDEO';
    case 'document': return 'DOCUMENT';
    default: return 'UNKNOWN';
  }
}
