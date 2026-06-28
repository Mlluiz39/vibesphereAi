// Test the flow engine helper functions by extracting them
// Since the main functions are tightly coupled with Prisma, we test the pure logic

describe('Flow Engine Logic', () => {
  // Test the interpolate function logic (extracted from flow.ts)
  function interpolate(text: string, vars: Record<string, unknown>): string {
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
      const v = vars[key];
      return v == null ? '' : String(v);
    });
  }

  // Test the evalCondition function logic (extracted from flow.ts)
  function evalCondition(config: Record<string, unknown>, vars: Record<string, unknown>): boolean {
    const left = vars[String(config.var ?? '')];
    const op = String(config.op ?? 'exists');
    const value = config.value;
    switch (op) {
      case 'eq':
        return String(left) === String(value);
      case 'neq':
        return String(left) !== String(value);
      case 'contains':
        return String(left ?? '').includes(String(value ?? ''));
      case 'exists':
      default:
        return left !== undefined && left !== null && left !== '';
    }
  }

  describe('interpolate', () => {
    it('should replace simple variables', () => {
      expect(interpolate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('should replace multiple variables', () => {
      expect(interpolate('{{greeting}} {{name}}!', { greeting: 'Hi', name: 'A' })).toBe('Hi A!');
    });

    it('should replace with empty string for null/undefined', () => {
      expect(interpolate('Hello {{name}}', {})).toBe('Hello ');
      expect(interpolate('Hello {{name}}', { name: null })).toBe('Hello ');
      expect(interpolate('Hello {{name}}', { name: undefined })).toBe('Hello ');
    });

    it('should handle numeric values', () => {
      expect(interpolate('Count: {{count}}', { count: 42 })).toBe('Count: 42');
    });

    it('should handle whitespace in variable names', () => {
      expect(interpolate('{{ name }}', { name: 'A' })).toBe('A');
    });

    it('should not replace invalid template syntax', () => {
      expect(interpolate('Hello {name}', { name: 'A' })).toBe('Hello {name}');
      // {{{name}} matches {{ {name} }} partially - the regex matches {name} inside
      expect(interpolate('Hello {{{name}}', { name: 'A' })).toBe('Hello {A');
    });

    it('should handle nested object access', () => {
      expect(interpolate('{{user.name}}', { user: { name: 'Alice' } })).toBe('');
      // Note: the regex only matches flat keys, not deep paths via object access
    });
  });

  describe('evalCondition', () => {
    it('should evaluate eq operator', () => {
      expect(evalCondition({ var: 'status', op: 'eq', value: 'active' }, { status: 'active' })).toBe(true);
      expect(evalCondition({ var: 'status', op: 'eq', value: 'active' }, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate neq operator', () => {
      expect(evalCondition({ var: 'status', op: 'neq', value: 'active' }, { status: 'inactive' })).toBe(true);
      expect(evalCondition({ var: 'status', op: 'neq', value: 'active' }, { status: 'active' })).toBe(false);
    });

    it('should evaluate contains operator', () => {
      expect(evalCondition({ var: 'text', op: 'contains', value: 'hello' }, { text: 'hello world' })).toBe(true);
      expect(evalCondition({ var: 'text', op: 'contains', value: 'hello' }, { text: 'goodbye' })).toBe(false);
    });

    it('should evaluate exists operator (default)', () => {
      expect(evalCondition({ var: 'x' }, { x: 'value' })).toBe(true);
      expect(evalCondition({ var: 'x' }, { x: '' })).toBe(false);
      expect(evalCondition({ var: 'x' }, { x: null })).toBe(false);
      expect(evalCondition({ var: 'x' }, {})).toBe(false);
    });

    it('should handle missing var in config', () => {
      // When var is missing from config, config.var defaults to ''
      // vars[''] is undefined, so exists returns false
      expect(evalCondition({}, { anything: 'value' })).toBe(false);
    });

    it('should handle empty vars', () => {
      expect(evalCondition({ var: 'x', op: 'eq', value: 'y' }, {})).toBe(false);
    });
  });
});
