import { withTenant } from '@vibesphere/database';
import { toSqlVector } from './vector';

export interface StoreChunk {
  text: string;
  embedding: number[];
}

/**
 * Persiste os chunks + embeddings de um documento no pgvector.
 * Roda dentro de withTenant para que a RLS aceite os inserts (app.current_tenant).
 * Substitui embeddings antigos do documento (suporte a reprocessamento — Req 6.5).
 */
export async function replaceDocumentEmbeddings(params: {
  tenantId: string;
  documentId: string;
  chunks: StoreChunk[];
}): Promise<number> {
  const { tenantId, documentId, chunks } = params;

  return withTenant(tenantId, async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM embeddings WHERE document_id = $1`, documentId);

    for (const chunk of chunks) {
      await tx.$executeRawUnsafe(
        `INSERT INTO embeddings (id, tenant_id, document_id, chunk_text, embedding, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, now())`,
        tenantId,
        documentId,
        chunk.text,
        toSqlVector(chunk.embedding),
      );
    }

    return chunks.length;
  });
}
