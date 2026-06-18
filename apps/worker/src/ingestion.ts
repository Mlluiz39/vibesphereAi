import { documentStoragePath } from '@vibesphere/shared';
import { DocumentStatus, withTenant } from '@vibesphere/database';
import { LLMProviderFactory, LLMProvider } from '@vibesphere/llm';
import { chunkText, embedTexts, replaceDocumentEmbeddings } from '@vibesphere/rag';
import { extractText } from './extract';

export interface IngestionJobData {
  tenantId: string;
  documentId: string;
}

const EMBEDDING_BATCH = 96;

let cachedProvider: LLMProvider | undefined;
function getEmbeddingProvider(): LLMProvider {
  if (!cachedProvider) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada para gerar embeddings');
    }
    cachedProvider = LLMProviderFactory.create({ kind: 'openai', apiKey });
  }
  return cachedProvider;
}

/**
 * Pipeline de ingestão — Requisitos 6.2/6.3.
 * extração -> chunking -> embeddings -> pgvector. Atualiza o status do documento.
 */
export async function processIngestion(data: IngestionJobData): Promise<{ chunks: number }> {
  const { tenantId, documentId } = data;
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

  // 1. Marca como processando e carrega o documento.
  const document = await withTenant(tenantId, async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return null;
    }
    await tx.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING, error: null },
    });
    return doc;
  });

  if (!document) {
    throw new Error(`Documento ${documentId} não encontrado`);
  }

  // 2. Resolve o caminho (URL usa um nome fixo de storage).
  const storageName = document.type === 'url' ? 'source.url' : document.filename;
  const filePath = documentStoragePath(tenantId, documentId, storageName);

  // 3. Extração + chunking.
  const text = await extractText(filePath, document.type);
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    await withTenant(tenantId, (tx) =>
      tx.document.update({ where: { id: documentId }, data: { status: DocumentStatus.DONE } }),
    );
    return { chunks: 0 };
  }

  // 4. Embeddings em lotes.
  const provider = getEmbeddingProvider();
  const stored: { text: string; embedding: number[] }[] = [];
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH);
    const vectors = await embedTexts(provider, embeddingModel, batch);
    batch.forEach((t, idx) => stored.push({ text: t, embedding: vectors[idx] ?? [] }));
  }

  // 5. Persiste no pgvector (substitui embeddings antigos — suporte a reprocessamento).
  await replaceDocumentEmbeddings({ tenantId, documentId, chunks: stored });

  // 6. Conclui.
  await withTenant(tenantId, (tx) =>
    tx.document.update({ where: { id: documentId }, data: { status: DocumentStatus.DONE } }),
  );

  return { chunks: stored.length };
}

/** Marca o documento como erro (chamado quando as retentativas se esgotam) — Req 6.5. */
export async function markIngestionError(data: IngestionJobData, message: string): Promise<void> {
  try {
    await withTenant(data.tenantId, (tx) =>
      tx.document.update({
        where: { id: data.documentId },
        data: { status: DocumentStatus.ERROR, error: message.slice(0, 1000) },
      }),
    );
  } catch {
    // best-effort
  }
}
