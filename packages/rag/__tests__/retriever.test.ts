jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

jest.mock('@vibesphere/llm', () => ({}));

import { buildContextBlock } from '../src/retriever';

describe('buildContextBlock', () => {
  it('should return empty string for empty chunks', () => {
    expect(buildContextBlock([])).toBe('');
  });

  it('should format single chunk', () => {
    const chunks = [{ chunkText: 'Hello world', distance: 0.1 }];
    expect(buildContextBlock(chunks)).toBe('[1] Hello world');
  });

  it('should format multiple chunks with indices', () => {
    const chunks = [
      { chunkText: 'First chunk', distance: 0.1 },
      { chunkText: 'Second chunk', distance: 0.2 },
      { chunkText: 'Third chunk', distance: 0.3 },
    ];
    const result = buildContextBlock(chunks);
    expect(result).toBe('[1] First chunk\n\n[2] Second chunk\n\n[3] Third chunk');
  });

  it('should handle chunks with special characters', () => {
    const chunks = [{ chunkText: 'Price: R$ 1.500,00', distance: 0.05 }];
    expect(buildContextBlock(chunks)).toBe('[1] Price: R$ 1.500,00');
  });

  it('should preserve chunk order', () => {
    const chunks = [
      { chunkText: 'C', distance: 0.3 },
      { chunkText: 'A', distance: 0.1 },
      { chunkText: 'B', distance: 0.2 },
    ];
    const result = buildContextBlock(chunks);
    expect(result).toContain('[1] C');
    expect(result).toContain('[2] A');
    expect(result).toContain('[3] B');
  });
});
