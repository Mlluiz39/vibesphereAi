import { createHmac, timingSafeEqual } from 'node:crypto';
import { InboundMessage, SendTextResult, WhatsAppProvider } from '../provider';

export interface MetaCloudCredentials {
  phoneNumberId: string;
  accessToken: string;
  /** Segredo do app para validar a assinatura do webhook (X-Hub-Signature-256). */
  appSecret?: string;
  /** Token de verificação usado no handshake GET do webhook. */
  verifyToken?: string;
}

const GRAPH_VERSION = 'v20.0';

/**
 * Adapter do WhatsApp via Meta Cloud API (Graph API) — Requisito 7.1.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta_cloud';

  constructor(private readonly creds: MetaCloudCredentials) {}

  async sendText(input: { to: string; text: string }): Promise<SendTextResult> {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.creds.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to,
        type: 'text',
        text: { body: input.text },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Falha ao enviar mensagem WhatsApp (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as { messages?: { id: string }[] };
    return { providerMessageId: data.messages?.[0]?.id ?? '' };
  }

  verifySignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    // Se não há appSecret configurado, não há como validar (aceita — uso em dev).
    if (!this.creds.appSecret) {
      return true;
    }
    if (!signatureHeader?.startsWith('sha256=')) {
      return false;
    }
    const expected = createHmac('sha256', this.creds.appSecret)
      .update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody)
      .digest('hex');
    const received = signatureHeader.slice('sha256='.length);

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Verifica o handshake GET do webhook (hub.verify_token). Retorna o challenge ou null. */
  verifyChallenge(query: {
    'hub.mode'?: string;
    'hub.verify_token'?: string;
    'hub.challenge'?: string;
  }): string | null {
    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === this.creds.verifyToken
    ) {
      return query['hub.challenge'] ?? '';
    }
    return null;
  }

  parseInbound(payload: unknown): InboundMessage[] {
    const result: InboundMessage[] = [];
    const body = payload as MetaWebhookBody;

    for (const entry of body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const contactsByWa = new Map<string, string>();
        for (const c of value?.contacts ?? []) {
          if (c.wa_id) {
            contactsByWa.set(c.wa_id, c.profile?.name ?? '');
          }
        }
        for (const msg of value?.messages ?? []) {
          if (msg.type !== 'text' || !msg.text?.body) {
            continue; // MVP: apenas texto
          }
          result.push({
            from: msg.from,
            text: msg.text.body,
            providerMessageId: msg.id,
            contactName: contactsByWa.get(msg.from) || undefined,
            timestamp: msg.timestamp ? Number(msg.timestamp) : undefined,
          });
        }
      }
    }
    return result;
  }
}

// Tipos parciais do payload do webhook da Meta Cloud API.
interface MetaWebhookBody {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          from: string;
          id: string;
          type: string;
          timestamp?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
}
