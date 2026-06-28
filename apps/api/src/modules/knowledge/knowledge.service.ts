import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { documentStoragePath } from '@vibesphere/shared';
import { DocumentStatus, withTenant } from '@vibesphere/database';
import { INGESTION_QUEUE } from '../../queue/queue.module';
import { IngestUrlDto, SUPPORTED_DOC_TYPES, SupportedDocType } from './dto/knowledge.dto';

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

/**
 * Bases de conhecimento + ingestão de documentos — Requisitos 6.1/6.2/6.5.
 * O processamento pesado (extração/chunking/embeddings) é assíncrono: aqui só
 * persistimos o documento como `pending` e enfileiramos o job de ingestão.
 */
@Injectable()
export class KnowledgeService {
  constructor(@Inject(INGESTION_QUEUE) private readonly ingestionQueue: Queue) {}

  // ---- Bases de conhecimento ----

  createBase(tenantId: string, name: string) {
    return withTenant(tenantId, (tx) => tx.knowledgeBase.create({ data: { tenantId, name } }));
  }

  listBases(tenantId: string) {
    return withTenant(tenantId, (tx) =>
      tx.knowledgeBase.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { documents: true } } },
      }),
    );
  }

  async getBase(tenantId: string, id: string) {
    const base = await withTenant(tenantId, (tx) =>
      tx.knowledgeBase.findUnique({ where: { id } }),
    );
    if (!base) {
      throw new NotFoundException('Base de conhecimento não encontrada');
    }
    return base;
  }

  async removeBase(tenantId: string, id: string) {
    await this.getBase(tenantId, id);
    await withTenant(tenantId, (tx) => tx.knowledgeBase.delete({ where: { id } }));
  }

  // ---- Documentos ----

  listDocuments(tenantId: string, knowledgeBaseId: string) {
    return withTenant(tenantId, (tx) =>
      tx.document.findMany({
        where: { knowledgeBaseId },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /** Upload de arquivo: grava no storage e enfileira a ingestão. */
  async uploadDocument(tenantId: string, knowledgeBaseId: string, file: UploadedFile) {
    await this.getBase(tenantId, knowledgeBaseId);
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    const type = this.resolveType(file.originalname);

    const document = await withTenant(tenantId, (tx) =>
      tx.document.create({
        data: {
          tenantId,
          knowledgeBaseId,
          filename: file.originalname,
          type,
          status: 'pending',
        },
      }),
    );

    const path = documentStoragePath(tenantId, document.id, file.originalname);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);

    await this.enqueue(tenantId, document.id);
    return document;
  }

  /** Ingestão a partir de URL: salva o link como "arquivo" e enfileira. */
  async ingestUrl(tenantId: string, knowledgeBaseId: string, dto: IngestUrlDto) {
    await this.getBase(tenantId, knowledgeBaseId);

    const document = await withTenant(tenantId, (tx) =>
      tx.document.create({
        data: {
          tenantId,
          knowledgeBaseId,
          filename: dto.title ?? dto.url,
          type: 'url',
          status: 'pending',
        },
      }),
    );

    // Para URL, o caminho de storage guarda o próprio link como conteúdo.
    const path = documentStoragePath(tenantId, document.id, 'source.url');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, dto.url, 'utf8');

    await this.enqueue(tenantId, document.id);
    return document;
  }

  /** Reprocessa um documento com erro (ou qualquer documento) — Requisito 6.5. */
  async reprocess(tenantId: string, documentId: string) {
    const document = await withTenant(tenantId, (tx) =>
      tx.document.findUnique({ where: { id: documentId } }),
    );
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    await withTenant(tenantId, (tx) =>
      tx.document.update({
        where: { id: documentId },
        data: { status: 'pending', error: null },
      }),
    );

    await this.enqueue(tenantId, documentId);
    return { documentId, status: 'pending' as const };
  }

  private enqueue(tenantId: string, documentId: string) {
    // jobId único por execução para permitir reprocessar o mesmo documento
    // (um jobId fixo seria deduplicado por jobs já concluídos/retidos).
    return this.ingestionQueue.add(
      'ingest',
      { tenantId, documentId },
      { jobId: `${documentId}:${Date.now()}` },
    );
  }

  private resolveType(filename: string): SupportedDocType {
    const ext = extname(filename).replace('.', '').toLowerCase();
    return (SUPPORTED_DOC_TYPES as readonly string[]).includes(ext)
      ? (ext as SupportedDocType)
      : 'txt';
  }
}
