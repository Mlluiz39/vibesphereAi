export interface ChunkOptions {
  /** Tamanho alvo de cada chunk em caracteres. */
  chunkSize?: number;
  /** Sobreposição entre chunks consecutivos (preserva contexto nas bordas). */
  overlap?: number;
}

const DEFAULTS: Required<ChunkOptions> = { chunkSize: 1000, overlap: 150 };

/**
 * Divide o texto em chunks com sobreposição. Tenta quebrar em fronteiras de
 * parágrafo/frase próximas ao limite para não cortar no meio de uma sentença.
 */
export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const { chunkSize, overlap } = { ...DEFAULTS, ...options };
  const text = input.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!text) {
    return [];
  }
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      // Procura uma fronteira "natural" perto do fim do chunk.
      const window = text.slice(start, end);
      const boundary = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('\n'),
      );
      if (boundary > chunkSize * 0.5) {
        end = start + boundary + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
