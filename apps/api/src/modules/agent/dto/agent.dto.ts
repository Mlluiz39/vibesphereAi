import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { LLMProviderKind } from '@vibesphere/shared';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;

  @IsOptional()
  @IsEnum(LLMProviderKind)
  provider?: LLMProviderKind;

  @IsOptional()
  @IsString()
  model?: string;

  // Associação a uma base de conhecimento — Requisito 5.6
  @IsOptional()
  @IsUUID()
  knowledgeBaseId?: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  systemPrompt?: string;

  @IsOptional()
  @IsEnum(LLMProviderKind)
  provider?: LLMProviderKind;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsUUID()
  knowledgeBaseId?: string | null;
}
