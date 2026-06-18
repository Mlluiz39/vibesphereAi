import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { WhatsAppProviderKind } from '@vibesphere/shared';

export class CreateChannelDto {
  @IsOptional()
  @IsEnum(WhatsAppProviderKind)
  provider?: WhatsAppProviderKind;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  // Credenciais Meta Cloud
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsOptional()
  @IsString()
  appSecret?: string;

  @IsOptional()
  @IsString()
  verifyToken?: string;

  // Agente que responde por padrão neste canal
  @IsOptional()
  @IsUUID()
  defaultAgentId?: string;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  defaultAgentId?: string | null;
}
