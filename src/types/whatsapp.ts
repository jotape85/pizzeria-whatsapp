// WhatsApp Cloud API webhook payload types
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string; // WABA ID
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: 'messages';
}

export interface WhatsAppValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WAContact[];
  messages?: WAMessage[];
  statuses?: WAStatus[];
  errors?: WAError[];
}

export interface WAContact {
  profile: { name: string };
  wa_id: string;
}

export interface WAMessage {
  id: string;
  from: string; // Sender's phone number
  timestamp: string;
  type:
    | 'text'
    | 'interactive'
    | 'image'
    | 'audio'
    | 'video'
    | 'document'
    | 'sticker'
    | 'location'
    | 'contacts'
    | 'button'
    | 'order'
    | 'unknown';
  text?: { body: string };
  interactive?: {
    type: 'list_reply' | 'button_reply';
    list_reply?: { id: string; title: string; description?: string };
    button_reply?: { id: string; title: string };
  };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; filename?: string; mime_type: string };
  button?: { payload: string; text: string };
  context?: { from: string; id: string }; // Reply context
}

export interface WAStatus {
  id: string;        // wamid
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; origin: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: WAError[];
}

export interface WAError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}

// Outbound message bodies
export interface WATextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

export interface WAInteractiveListMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
  };
}

export interface WAInteractiveButtonMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button';
    body: { text: string };
    action: {
      buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
    };
  };
}

export interface WAMarkReadMessage {
  messaging_product: 'whatsapp';
  status: 'read';
  message_id: string;
}
