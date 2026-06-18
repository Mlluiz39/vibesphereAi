import { readFile } from 'node:fs/promises';
import { parse as parseHtml } from 'node-html-parser';

/**
 * Extrai texto de um documento conforme o tipo — Requisito 6.1.
 * Formatos binários usam libs dedicadas; texto puro é lido diretamente.
 */
export async function extractText(filePath: string, type: string): Promise<string> {
  switch (type) {
    case 'txt':
    case 'md':
    case 'csv':
      return (await readFile(filePath, 'utf8')).toString();

    case 'html':
      return stripHtml((await readFile(filePath, 'utf8')).toString());

    case 'url':
      return extractFromUrl((await readFile(filePath, 'utf8')).toString().trim());

    case 'pdf':
      return extractPdf(filePath);

    case 'docx':
      return extractDocx(filePath);

    case 'xlsx':
      return extractXlsx(filePath);

    default:
      // Fallback: tenta ler como texto.
      return (await readFile(filePath, 'utf8')).toString();
  }
}

function stripHtml(html: string): string {
  const root = parseHtml(html);
  root.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  return root.text.replace(/\n{3,}/g, '\n\n').trim();
}

async function extractFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar URL (${res.status}): ${url}`);
  }
  const html = await res.text();
  return stripHtml(html);
}

async function extractPdf(filePath: string): Promise<string> {
  const { default: pdfParse } = await import('pdf-parse');
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractDocx(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value.trim();
}

async function extractXlsx(filePath: string): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.readFile(filePath);
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return `# ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
  })
    .join('\n\n')
    .trim();
}
