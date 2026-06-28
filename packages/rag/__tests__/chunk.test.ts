import { chunkText } from '../src/chunk';

describe('chunkText', () => {
  it('should return empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('should return single chunk for text shorter than chunkSize', () => {
    const text = 'Hello world';
    expect(chunkText(text, { chunkSize: 1000 })).toEqual([text]);
  });

  it('should return single chunk when text equals chunkSize', () => {
    const text = 'a'.repeat(1000);
    const result = chunkText(text, { chunkSize: 1000 });
    expect(result).toHaveLength(1);
  });

  it('should split text into multiple chunks', () => {
    const text = 'a'.repeat(3000);
    const result = chunkText(text, { chunkSize: 1000, overlap: 0 });
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should try to break at natural boundaries', () => {
    const paragraph1 = 'First paragraph with some content.';
    const paragraph2 = 'Second paragraph with more content.';
    const text = paragraph1 + '\n\n' + paragraph2;
    const result = chunkText(text, { chunkSize: 40, overlap: 0 });
    // Should break at the paragraph boundary
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toContain('First paragraph');
  });

  it('should handle text with only newlines', () => {
    const text = '\n\n\n\n\n';
    expect(chunkText(text)).toEqual([]);
  });

  it('should collapse multiple newlines', () => {
    const text = 'a\n\n\n\n\nb';
    const result = chunkText(text, { chunkSize: 1000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('a\n\nb');
  });

  it('should handle CRLF line endings', () => {
    const text = 'line1\r\n\r\nline2';
    const result = chunkText(text, { chunkSize: 1000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('line1\n\nline2');
  });

  it('should respect overlap parameter', () => {
    const text = 'a'.repeat(2500);
    const resultNoOverlap = chunkText(text, { chunkSize: 1000, overlap: 0 });
    const resultWithOverlap = chunkText(text, { chunkSize: 1000, overlap: 200 });
    // With overlap, we should get more chunks (or same) due to overlapping regions
    expect(resultWithOverlap.length).toBeGreaterThanOrEqual(resultNoOverlap.length);
  });

  it('should trim leading/trailing whitespace from chunks', () => {
    const text = '  hello  \n\n  world  ';
    const result = chunkText(text, { chunkSize: 1000 });
    expect(result[0]).toBe('hello  \n\n  world');
  });

  it('should not create empty chunks', () => {
    const text = 'a'.repeat(5000);
    const result = chunkText(text, { chunkSize: 1000, overlap: 150 });
    for (const chunk of result) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });
});
