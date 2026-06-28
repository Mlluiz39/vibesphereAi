import { TEMPLATES, findTemplate } from '../templates.catalog';

describe('TEMPLATES', () => {
  it('should have 4 templates', () => {
    expect(TEMPLATES).toHaveLength(4);
  });

  it('should have unique IDs', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields for all templates', () => {
    for (const template of TEMPLATES) {
      expect(template.id).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.title).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.agent).toBeDefined();
      expect(template.agent?.systemPrompt).toBeDefined();
    }
  });

  it('should have specific categories', () => {
    const categories = TEMPLATES.map((t) => t.category);
    expect(categories).toContain('Vendas');
    expect(categories).toContain('Clínicas');
    expect(categories).toContain('Imobiliárias');
    expect(categories).toContain('Suporte');
  });
});

describe('findTemplate', () => {
  it('should find template by ID', () => {
    const template = findTemplate('sales-sdr');
    expect(template).toBeDefined();
    expect(template?.title).toBe('SDR de Vendas');
  });

  it('should return undefined for unknown ID', () => {
    expect(findTemplate('nonexistent')).toBeUndefined();
  });

  it('should find all templates', () => {
    for (const t of TEMPLATES) {
      expect(findTemplate(t.id)).toBeDefined();
    }
  });
});
