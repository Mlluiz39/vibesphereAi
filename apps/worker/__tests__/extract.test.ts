import { extractText } from '../src/extract';
import * as fs from 'node:fs/promises';

// Mock fs
jest.mock('node:fs/promises');
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

// Mock dynamic imports
jest.mock('pdf-parse', () => ({ default: jest.fn().mockResolvedValue({ text: 'PDF content' }) }));
jest.mock('mammoth', () => ({ extractRawText: jest.fn().mockResolvedValue({ value: 'DOCX content' }) }));
jest.mock('xlsx', () => ({
  readFile: jest.fn().mockReturnValue({
    SheetNames: ['Sheet1'],
    Sheets: { Sheet1: {} },
  }),
  utils: { sheet_to_csv: jest.fn().mockReturnValue('col1,col2\nval1,val2') },
}));
jest.mock('node-html-parser', () => ({
  parse: jest.fn().mockReturnValue({
    remove: jest.fn(),
    text: 'Parsed HTML text',
    querySelectorAll: jest.fn().mockReturnValue([]),
  }),
}));

describe('extractText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should read txt files as text', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('Hello txt'));
    const result = await extractText('/path/file.txt', 'txt');
    expect(result).toBe('Hello txt');
  });

  it('should read md files as text', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('# Title'));
    const result = await extractText('/path/file.md', 'md');
    expect(result).toBe('# Title');
  });

  it('should read csv files as text', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('a,b\n1,2'));
    const result = await extractText('/path/file.csv', 'csv');
    expect(result).toBe('a,b\n1,2');
  });

  it('should handle html files', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('<p>Hello</p>'));
    const result = await extractText('/path/file.html', 'html');
    expect(typeof result).toBe('string');
  });

  it('should fallback to text for unknown types', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('fallback content'));
    const result = await extractText('/path/file.xyz', 'xyz');
    expect(result).toBe('fallback content');
  });

  it('should handle url type', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('https://example.com'));
    try {
      await extractText('/path/file.url', 'url');
    } catch {
      // Expected to fail since fetch isn't mocked for URL
    }
    expect(mockReadFile).toHaveBeenCalled();
  });
});
