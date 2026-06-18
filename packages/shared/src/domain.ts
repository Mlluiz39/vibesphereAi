/**
 * Tipos de domínio compartilhados entre API, worker e dashboard.
 */

export enum ConversationState {
  AI = 'ai',
  HUMAN = 'human',
  WAITING = 'waiting',
  CLOSED = 'closed',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  ERROR = 'error',
}

export enum WhatsAppProviderKind {
  META_CLOUD = 'meta_cloud',
  EVOLUTION = 'evolution',
  BAILEYS = 'baileys',
}

export enum LLMProviderKind {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  OPENROUTER = 'openrouter',
}

/** Conteúdo do JWT de acesso. */
export interface AuthTokenPayload {
  sub: string; // user id
  tenantId: string;
  role: string;
}

/** Nomes das filas BullMQ. */
export const QUEUE = {
  INBOUND_MESSAGES: 'inbound-messages',
  DOCUMENT_INGESTION: 'document-ingestion',
} as const;
