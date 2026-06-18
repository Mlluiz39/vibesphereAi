import { withTenant } from '@vibesphere/database';
import { LLMProvider } from '@vibesphere/llm';
import { embedQuery } from './embeddings';
import { toSqlVector } from './vector';

export interface RetrievedChunk {
  chunkText: string;
  distance: number;
}

/**
 * Recupera os chunks mais relevantes de uma base de conhecimento para a query.
 * Usa similaridade de cosseno do pgvector (operador `<=>`) — Requisito 6.4.
 * Escopado por tenant via withTenant/RLS.
 */
export async function retrieveRelevantChunks(params: {
  tenantId: string;
  knowledgeBaseId: string;
  query: string;
  provider: LLMProvider;
  embeddingModel: string;
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const { tenantId, knowledgeBaseId, query, provider, embeddingModel, limit = 5 } = params;

  const queryVector = await embedQuery(provider, embeddingModel, query);
  if (queryVector.length === 0) {
    return [];
  }
  const literal = toSqlVector(queryVector);

  return withTenant(tenantId, (tx) =>
    tx.$queryRawUnsafe<RetrievedChunk[]>(
      `SELECT e.chunk_text AS "chunkText",
              (e.embedding <=> $1::vector) AS "distance"
         FROM embeddings e
         JOIN documents d ON d.id = e.document_id
        WHERE d.knowledge_base_id = $2
        ORDER BY e.embedding <=> $1::vector
        LIMIT ${Math.max(1, Math.min(limit, 50))}`,
      literal,
      knowledgeBaseId,
    ),
  );
}

/** Monta um bloco de contexto a partir dos chunks recuperados, para o prompt. */
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }
  return chunks.map((c, i) => `[${i + 1}] ${c.chunkText}`).join('\n\n');
}
