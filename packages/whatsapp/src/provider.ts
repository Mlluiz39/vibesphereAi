/**
 * Camada de abstração de WhatsApp — Requisito 7.1.
 * Permite trocar entre Meta Cloud API, Evolution API e Baileys sem alterar a
 * lógica de negócio (webhook, engine de conversa).
 */

export interface InboundMessage {
  /** Telefone do remetente (cliente). */
  from: string;
  /** Texto da mensagem (apenas mensagens de texto no MVP). */
  text: string;
  /** ID da mensagem no provider (para idempotência). */
  providerMessageId: string;
  /** Nome de exibição do contato, quando disponível. */
  contactName?: string;
  /** Timestamp do provider (epoch segundos), quando disponível. */
  timestamp?: number;
}

export interface SendTextResult {
  providerMessageId: string;
}

export interface WhatsAppProvider {
  readonly name: string;

  /** Envia uma mensagem de texto para um destinatário. */
  sendText(input: { to: string; text: string }): Promise<SendTextResult>;

  /** Valida a assinatura HMAC do webhook (POST). */
  verifySignature(rawBody: Buffer | string, signatureHeader?: string): boolean;

  /** Extrai as mensagens recebidas de um payload de webhook. */
  parseInbound(payload: unknown): InboundMessage[];
}
