import { ResilientLLMProvider } from '../src/resilient.provider';
import { LLMProvider, ChatInput, EmbeddingsInput, CompletionInput } from '../src/provider';

function createMockProvider(name = 'mock'): LLMProvider {
  return {
    name,
    chat: jest.fn(),
    embeddings: jest.fn(),
    completion: jest.fn(),
  };
}

describe('ResilientLLMProvider', () => {
  describe('chat', () => {
    it('should return result from primary provider on success', async () => {
      const primary = createMockProvider('primary');
      const fallback = createMockProvider('fallback');
      const expected = { content: 'hello', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
      (primary.chat as jest.Mock).mockResolvedValue(expected);

      const resilient = new ResilientLLMProvider(primary, fallback, { maxRetries: 2, baseDelayMs: 10 });
      const input: ChatInput = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
      const result = await resilient.chat(input);

      expect(result).toEqual(expected);
      expect(primary.chat).toHaveBeenCalledWith(input);
      expect(fallback.chat).not.toHaveBeenCalled();
    });

    it('should retry on failure and succeed', async () => {
      const primary = createMockProvider('primary');
      const fallback = createMockProvider('fallback');
      const expected = { content: 'retry-ok', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
      (primary.chat as jest.Mock)
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockResolvedValueOnce(expected);

      const resilient = new ResilientLLMProvider(primary, fallback, { maxRetries: 2, baseDelayMs: 10 });
      const input: ChatInput = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
      const result = await resilient.chat(input);

      expect(result).toEqual(expected);
      expect(primary.chat).toHaveBeenCalledTimes(2);
      expect(fallback.chat).not.toHaveBeenCalled();
    });

    it('should fallback to secondary after all retries fail', async () => {
      const primary = createMockProvider('primary');
      const fallback = createMockProvider('fallback');
      const expected = { content: 'fallback-ok', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
      (primary.chat as jest.Mock).mockRejectedValue(new Error('always-fail'));
      (fallback.chat as jest.Mock).mockResolvedValue(expected);

      const resilient = new ResilientLLMProvider(primary, fallback, { maxRetries: 1, baseDelayMs: 10 });
      const input: ChatInput = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
      const result = await resilient.chat(input);

      expect(result).toEqual(expected);
      expect(primary.chat).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
      expect(fallback.chat).toHaveBeenCalledWith(input);
    });

    it('should throw when no fallback and all retries fail', async () => {
      const primary = createMockProvider('primary');
      (primary.chat as jest.Mock).mockRejectedValue(new Error('no-recovery'));

      const resilient = new ResilientLLMProvider(primary, undefined, { maxRetries: 1, baseDelayMs: 10 });
      const input: ChatInput = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };

      await expect(resilient.chat(input)).rejects.toThrow('no-recovery');
    });
  });

  describe('embeddings', () => {
    it('should return embeddings from primary on success', async () => {
      const primary = createMockProvider('primary');
      const expected = [[0.1, 0.2, 0.3]];
      (primary.embeddings as jest.Mock).mockResolvedValue(expected);

      const resilient = new ResilientLLMProvider(primary, undefined, { baseDelayMs: 10 });
      const input: EmbeddingsInput = { model: 'text-embedding-3-small', input: ['hello'] };
      const result = await resilient.embeddings(input);

      expect(result).toEqual(expected);
    });

    it('should retry and fallback on embeddings failure', async () => {
      const primary = createMockProvider('primary');
      const fallback = createMockProvider('fallback');
      const expected = [[0.4, 0.5, 0.6]];
      (primary.embeddings as jest.Mock).mockRejectedValue(new Error('fail'));
      (fallback.embeddings as jest.Mock).mockResolvedValue(expected);

      const resilient = new ResilientLLMProvider(primary, fallback, { maxRetries: 1, baseDelayMs: 10 });
      const input: EmbeddingsInput = { model: 'text-embedding-3-small', input: ['hello'] };
      const result = await resilient.embeddings(input);

      expect(result).toEqual(expected);
    });
  });

  describe('completion', () => {
    it('should return completion from primary on success', async () => {
      const primary = createMockProvider('primary');
      (primary.completion as jest.Mock).mockResolvedValue('done');

      const resilient = new ResilientLLMProvider(primary, undefined, { baseDelayMs: 10 });
      const input: CompletionInput = { model: 'gpt-4', prompt: 'test' };
      const result = await resilient.completion(input);

      expect(result).toBe('done');
    });

    it('should retry and fallback on completion failure', async () => {
      const primary = createMockProvider('primary');
      const fallback = createMockProvider('fallback');
      (primary.completion as jest.Mock).mockRejectedValue(new Error('fail'));
      (fallback.completion as jest.Mock).mockResolvedValue('fallback-done');

      const resilient = new ResilientLLMProvider(primary, fallback, { maxRetries: 1, baseDelayMs: 10 });
      const input: CompletionInput = { model: 'gpt-4', prompt: 'test' };
      const result = await resilient.completion(input);

      expect(result).toBe('fallback-done');
    });
  });

  describe('defaults', () => {
    it('should use default options when not provided', () => {
      const primary = createMockProvider('primary');
      const resilient = new ResilientLLMProvider(primary);
      expect(resilient.name).toBe('resilient');
    });
  });
});
