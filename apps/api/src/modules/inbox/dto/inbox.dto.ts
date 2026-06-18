import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationState } from '@vibesphere/shared';

export class ListConversationsQuery {
  @IsOptional()
  @IsEnum(ConversationState)
  state?: ConversationState;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class SetStateDto {
  @IsEnum(ConversationState)
  state!: ConversationState;
}

export class TransferDto {
  @IsUUID()
  toUserId!: string;
}

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class AssignLabelDto {
  @IsUUID()
  labelId!: string;
}
