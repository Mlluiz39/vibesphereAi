/**
 * Camada de abstração de LLM — Requisito 5.4.
 * Permite trocar de provedor (OpenAI, Claude, Gemini, ...) sem alterar a lógica de negócio.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatInput {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  usage: TokenUsage;
}

export interface EmbeddingsInput {
  model: string;
  input: string[];
}

export interface CompletionInput {
  model: string;
  prompt: string;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: string;
  chat(input: ChatInput): Promise<ChatResult>;
  embeddings(input: EmbeddingsInput): Promise<number[][]>;
  completion(input: CompletionInput): Promise<string>;
}
