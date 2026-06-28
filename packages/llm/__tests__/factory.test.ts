jest.mock('../src/providers/openai.provider', () => ({
  OpenAIProvider: jest.fn().mockImplementation((opts) => ({
    name: 'openai',
    chat: jest.fn(),
    embeddings: jest.fn(),
    completion: jest.fn(),
    opts,
  })),
}));

import { LLMProviderFactory } from '../src/factory';
import { LLMProviderKind } from '@vibesphere/shared';

describe('LLMProviderFactory', () => {
  it('should create an OpenAI provider', () => {
    const provider = LLMProviderFactory.create({
      kind: LLMProviderKind.OPENAI,
      apiKey: 'sk-test',
    });
    expect(provider).toBeDefined();
    expect(provider.name).toBe('openai');
  });

  it('should create a DeepSeek provider with default baseURL', () => {
    const provider = LLMProviderFactory.create({
      kind: LLMProviderKind.DEEPSEEK,
      apiKey: 'sk-test',
    });
    expect(provider).toBeDefined();
  });

  it('should create a DeepSeek provider with custom baseURL', () => {
    const provider = LLMProviderFactory.create({
      kind: LLMProviderKind.DEEPSEEK,
      apiKey: 'sk-test',
      baseURL: 'https://custom.deepseek.com',
    });
    expect(provider).toBeDefined();
  });

  it('should create an OpenRouter provider', () => {
    const provider = LLMProviderFactory.create({
      kind: LLMProviderKind.OPENROUTER,
      apiKey: 'sk-test',
    });
    expect(provider).toBeDefined();
  });

  it('should throw for unsupported provider', () => {
    expect(() =>
      LLMProviderFactory.create({
        kind: 'unsupported_provider' as LLMProviderKind,
        apiKey: 'sk-test',
      }),
    ).toThrow('Provider LLM não suportado');
  });
});
