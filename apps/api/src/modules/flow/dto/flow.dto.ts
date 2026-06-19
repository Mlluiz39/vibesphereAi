import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export const NODE_TYPES = [
  'start',
  'message',
  'condition',
  'delay',
  'webhook',
  'ai',
  'end',
] as const;

export class FlowNodeDto {
  // ID lógico do nó (referenciado pelas edges). Mapeado para UUID ao salvar.
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsIn(NODE_TYPES)
  type!: (typeof NODE_TYPES)[number];

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional() @IsInt() posX?: number;
  @IsOptional() @IsInt() posY?: number;
}

export class FlowEdgeDto {
  @IsString() @IsNotEmpty() from!: string;
  @IsString() @IsNotEmpty() to!: string;
  @IsOptional() @IsString() label?: string;
}

export class UpsertFlowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsIn(['manual', 'inbound_message'])
  triggerType?: 'manual' | 'inbound_message';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowNodeDto)
  nodes!: FlowNodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowEdgeDto)
  edges?: FlowEdgeDto[];
}

export class RunFlowDto {
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class UpdateFlowStatusDto {
  @IsIn(['draft', 'active', 'inactive'])
  status!: 'draft' | 'active' | 'inactive';
}

export class ListFlowsQuery {
  @IsOptional() @IsUUID() id?: string;
}
