import { LLMProvider, LLMProviderFactory, ResilientLLMProvider } from '@vibesphere/llm';
import { LLMProviderKind } from '@vibesphere/shared';

/**
 * Resolve as API keys por provider a partir do ambiente.
 * Fallback para OPENAI_API_KEY mantém o MVP simples.
 */
function apiKeyFor(kind: string): string {
  const map: Record<string, string | undefined> = {
    [LLMProviderKind.OPENAI]: process.env.OPENAI_API_KEY,
    [LLMProviderKind.DEEPSEEK]: process.env.DEEPSEEK_API_KEY,
    [LLMProviderKind.OPENROUTER]: process.env.OPENROUTER_API_KEY,
  };
  const key = map[kind] ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(`API key não configurada para o provider "${kind}"`);
  }
  return key;
}

const chatCache = new Map<string, LLMProvider>();

/** Provider de chat para um agente, com retry/fallback (Req 5.5). */
export function getChatProvider(kind: string): LLMProvider {
  const cached = chatCache.get(kind);
  if (cached) {
    return cached;
  }
  const primary = LLMProviderFactory.create({ kind, apiKey: apiKeyFor(kind) });

  // Fallback para OpenAI quando o provider principal não é OpenAI e há chave.
  let fallback: LLMProvider | undefined;
  if (kind !== LLMProviderKind.OPENAI && process.env.OPENAI_API_KEY) {
    fallback = LLMProviderFactory.create({
      kind: LLMProviderKind.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  const provider = new ResilientLLMProvider(primary, fallback);
  chatCache.set(kind, provider);
  return provider;
}

let embeddingProvider: LLMProvider | undefined;

/** Provider de embeddings (sempre OpenAI no MVP). */
export function getEmbeddingProvider(): LLMProvider {
  if (!embeddingProvider) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada para gerar embeddings');
    }
    embeddingProvider = LLMProviderFactory.create({ kind: LLMProviderKind.OPENAI, apiKey });
  }
  return embeddingProvider;
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
}
