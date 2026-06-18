import { ChatInput, ChatResult, CompletionInput, EmbeddingsInput, LLMProvider } from './provider';

export interface ResilientOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decora um provider primário com retry exponencial e fallback para um secundário.
 * Atende o Requisito 5.5 (troca automática entre provedores em caso de falha).
 */
export class ResilientLLMProvider implements LLMProvider {
  readonly name = 'resilient';
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(
    private readonly primary: LLMProvider,
    private readonly fallback?: LLMProvider,
    options: ResilientOptions = {},
  ) {
    this.maxRetries = options.maxRetries ?? 2;
    this.baseDelayMs = options.baseDelayMs ?? 300;
  }

  private async withResilience<T>(op: (p: LLMProvider) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await op(this.primary);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(this.baseDelayMs * 2 ** attempt);
        }
      }
    }
    if (this.fallback) {
      return op(this.fallback);
    }
    throw lastError;
  }

  chat(input: ChatInput): Promise<ChatResult> {
    return this.withResilience((p) => p.chat(input));
  }

  embeddings(input: EmbeddingsInput): Promise<number[][]> {
    return this.withResilience((p) => p.embeddings(input));
  }

  completion(input: CompletionInput): Promise<string> {
    return this.withResilience((p) => p.completion(input));
  }
}
