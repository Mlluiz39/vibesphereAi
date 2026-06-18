import OpenAI from 'openai';
import {
  ChatInput,
  ChatResult,
  CompletionInput,
  EmbeddingsInput,
  LLMProvider,
} from '../provider';

export interface OpenAIProviderOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * Adapter do provider OpenAI. Também serve de base para provedores compatíveis
 * com a API da OpenAI (ex.: OpenRouter, DeepSeek) via `baseURL`.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
  }

  async chat(input: ChatInput): Promise<ChatResult> {
    const response = await this.client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
      messages: input.messages,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async embeddings(input: EmbeddingsInput): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: input.model,
      input: input.input,
    });
    return response.data.map((d) => d.embedding);
  }

  async completion(input: CompletionInput): Promise<string> {
    const result = await this.chat({
      model: input.model,
      temperature: input.temperature,
      messages: [{ role: 'user', content: input.prompt }],
    });
    return result.content;
  }
}
