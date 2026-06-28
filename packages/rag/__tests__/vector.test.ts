import { toSqlVector } from '../src/vector';

describe('toSqlVector', () => {
  it('should format a single-element array', () => {
    expect(toSqlVector([0.5])).toBe('[0.5]');
  });

  it('should format a multi-element array', () => {
    expect(toSqlVector([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('should handle empty array', () => {
    expect(toSqlVector([])).toBe('[]');
  });

  it('should handle negative values', () => {
    expect(toSqlVector([-0.5, 0.3, -0.1])).toBe('[-0.5,0.3,-0.1]');
  });

  it('should handle large arrays', () => {
    const values = new Array(1536).fill(0).map((_, i) => i / 1536);
    const result = toSqlVector(values);
    expect(result.startsWith('[')).toBe(true);
    expect(result.endsWith(']')).toBe(true);
    expect(result.split(',').length).toBe(1536);
  });

  it('should preserve precision', () => {
    expect(toSqlVector([0.123456789])).toBe('[0.123456789]');
  });
});
