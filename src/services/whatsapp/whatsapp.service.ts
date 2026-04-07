import axios from 'axios';
import type {
  WAInteractiveButtonMessage,
  WAInteractiveListMessage,
  WAMarkReadMessage,
  WATextMessage,
} from '@/types/whatsapp';

const WA_API_VERSION = 'v19.0';
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}`;

/**
 * WhatsApp Cloud API service.
 *
 * Handles all outbound messaging to customers via Meta's Graph API.
 * Designed to support text, interactive lists, buttons, and templates.
 *
 * Interactive lists and buttons are currently used for:
 * - Category selection (list)
 * - Product selection (list)
 * - Variant selection (list)
 * - Cart confirmation (buttons)
 *
 * TODO: When template messages are approved in Meta, add method sendTemplate()
 * for order confirmation receipts and marketing messages.
 */
export class WhatsAppService {
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
  }

  // ─── CORE SEND ────────────────────────────────────────────────────────────

  private async send(
    body: WATextMessage | WAInteractiveListMessage | WAInteractiveButtonMessage | WAMarkReadMessage
  ): Promise<string | void> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('[WhatsApp] No credentials configured — message not sent:', JSON.stringify(body).slice(0, 100));
      return;
    }

    try {
      const response = await axios.post(
        `${WA_BASE_URL}/${this.phoneNumberId}/messages`,
        body,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const wamid = response.data?.messages?.[0]?.id as string | undefined;
      return wamid;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[WhatsApp] API error:',
          error.response?.status,
          JSON.stringify(error.response?.data)
        );
      }
      throw error;
    }
  }

  // ─── TEXT MESSAGE ─────────────────────────────────────────────────────────

  async sendText(to: string, text: string): Promise<string | void> {
    const body: WATextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    };
    return this.send(body);
  }

  // ─── INTERACTIVE LIST ─────────────────────────────────────────────────────
  // Used for menus with more than 3 options (categories, products, variants)

  async sendList(
    to: string,
    opts: {
      header?: string;
      body: string;
      footer?: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    }
  ): Promise<string | void> {
    const body: WAInteractiveListMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
        body: { text: opts.body },
        ...(opts.footer ? { footer: { text: opts.footer } } : {}),
        action: {
          button: opts.buttonText,
          sections: opts.sections,
        },
      },
    };
    return this.send(body);
  }

  // ─── INTERACTIVE BUTTONS ──────────────────────────────────────────────────
  // Used for yes/no confirmations and short action menus (max 3 buttons)

  async sendButtons(
    to: string,
    opts: {
      body: string;
      buttons: Array<{ id: string; title: string }>;
    }
  ): Promise<string | void> {
    const body: WAInteractiveButtonMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: opts.body },
        action: {
          buttons: opts.buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    };
    return this.send(body);
  }

  // ─── MARK AS READ ─────────────────────────────────────────────────────────

  async markAsRead(waMessageId: string): Promise<void> {
    const body: WAMarkReadMessage = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: waMessageId,
    };
    await this.send(body as never);
  }

  // ─── TEMPLATE (future) ────────────────────────────────────────────────────
  // TODO: Implement when Meta-approved templates are available
  // Used for: order confirmation, payment reminder, order ready notification
  async sendTemplate(
    _to: string,
    _templateName: string,
    _languageCode: string,
    _components: unknown[]
  ): Promise<string | void> {
    throw new Error('Template messages not yet implemented. Use sendText() for now.');
  }
}
