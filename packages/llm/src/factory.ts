import { LLMProviderKind } from '@vibesphere/shared';
import { LLMProvider } from './provider';
import { OpenAIProvider } from './providers/openai.provider';

export interface ProviderConfig {
  kind: LLMProviderKind | string;
  apiKey: string;
  baseURL?: string;
}

/**
 * Resolve o `LLMProvider` concreto a partir da configuração do agente.
 * Novos provedores (Claude, Gemini, ...) são adicionados aqui sem afetar os consumidores.
 */
export class LLMProviderFactory {
  static create(config: ProviderConfig): LLMProvider {
    switch (config.kind) {
      case LLMProviderKind.OPENAI:
        return new OpenAIProvider({ apiKey: config.apiKey });
      case LLMProviderKind.DEEPSEEK:
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? 'https://api.deepseek.com',
        });
      case LLMProviderKind.OPENROUTER:
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? 'https://openrouter.ai/api/v1',
        });
      // TODO Fase 2: ClaudeProvider, GeminiProvider
      default:
        throw new Error(`Provider LLM não suportado: ${config.kind}`);
    }
  }
}
