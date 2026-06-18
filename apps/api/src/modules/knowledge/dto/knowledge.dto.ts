import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

/** Ingestão a partir de uma URL (alternativa ao upload de arquivo) — Req 6.1. */
export class IngestUrlDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export const SUPPORTED_DOC_TYPES = [
  'pdf',
  'docx',
  'txt',
  'csv',
  'xlsx',
  'md',
  'html',
  'url',
] as const;

export type SupportedDocType = (typeof SUPPORTED_DOC_TYPES)[number];

export class CreateDocumentMetaDto {
  @IsOptional()
  @IsIn(SUPPORTED_DOC_TYPES)
  type?: SupportedDocType;
}
