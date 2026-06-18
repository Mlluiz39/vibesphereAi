import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() contactId?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() contactId?: string;
}

export class ListLeadsQuery {
  @IsOptional() @IsString() status?: string;
}

export class CreatePipelineDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  // Nomes dos estágios na ordem desejada.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  stages?: string[];
}

export class CreateOpportunityDto {
  @IsUUID() leadId!: string;
  @IsUUID() pipelineId!: string;
  @IsUUID() stageId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;
}

export class MoveStageDto {
  @IsUUID()
  stageId!: string;
}
