import { join } from 'node:path';

/**
 * Convenção de caminho de armazenamento de documentos, compartilhada entre API
 * (escrita no upload) e worker (leitura na ingestão). Evita um campo extra no
 * schema: o caminho é derivado de tenantId + documentId + filename.
 *
 * O diretório base vem de UPLOAD_DIR (default ./uploads) e deve ser um volume
 * acessível por API e worker.
 */
export function uploadBaseDir(): string {
  return process.env.UPLOAD_DIR ?? './uploads';
}

export function documentStoragePath(
  tenantId: string,
  documentId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  return join(uploadBaseDir(), tenantId, `${documentId}__${safeName}`);
}
