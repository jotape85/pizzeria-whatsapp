import type {
  WAMessage,
  WAStatus,
  WhatsAppWebhookPayload,
} from '@/types/whatsapp';
import type { IncomingMessage } from '@/types/bot';

export interface ParsedWebhook {
  phoneNumberId: string;
  messages: IncomingMessage[];
  statuses: WAStatus[];
  contacts: Array<{ phone: string; name?: string }>;
}

/**
 * Normalizes the deeply-nested WhatsApp Cloud API webhook payload
 * into a flat, typed structure the rest of the app can use.
 */
export function parseWebhookPayload(body: WhatsAppWebhookPayload): ParsedWebhook {
  const result: ParsedWebhook = {
    phoneNumberId: '',
    messages: [],
    statuses: [],
    contacts: [],
  };

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      result.phoneNumberId = value.metadata?.phone_number_id ?? '';

      // Contacts (name info)
      for (const contact of value.contacts ?? []) {
        result.contacts.push({
          phone: contact.wa_id,
          name: contact.profile?.name,
        });
      }

      // Inbound messages
      for (const msg of value.messages ?? []) {
        result.messages.push(normalizeMessage(msg));
      }

      // Status updates (sent/delivered/read/failed)
      for (const status of value.statuses ?? []) {
        result.statuses.push(status);
      }
    }
  }

  return result;
}

function normalizeMessage(msg: WAMessage): IncomingMessage {
  const base = {
    from: msg.from,
    waMessageId: msg.id,
    timestamp: msg.timestamp,
  };

  switch (msg.type) {
    case 'text':
      return { ...base, type: 'text', text: msg.text?.body };

    case 'interactive': {
      const interactive = msg.interactive;
      if (!interactive) return { ...base, type: 'unknown' };

      const reply =
        interactive.type === 'list_reply'
          ? interactive.list_reply
          : interactive.button_reply;

      return {
        ...base,
        type: 'interactive',
        text: reply?.title,
        interactiveReply: reply
          ? {
              type: interactive.type as 'list_reply' | 'button_reply',
              id: reply.id,
              title: reply.title,
            }
          : undefined,
      };
    }

    case 'button':
      // Template button reply — treat as text
      return { ...base, type: 'text', text: msg.button?.text ?? msg.button?.payload };

    case 'image':
      return { ...base, type: 'image' };

    case 'audio':
      return { ...base, type: 'audio' };

    case 'video':
      return { ...base, type: 'video' };

    case 'document':
      return { ...base, type: 'document' };

    default:
      return { ...base, type: 'unknown' };
  }
}
