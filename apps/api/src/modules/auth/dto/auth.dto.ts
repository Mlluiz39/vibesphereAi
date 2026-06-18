import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/, {
    message: 'subdomain deve conter apenas letras minúsculas, números e hífens',
  })
  subdomain!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  // Necessário pois email é único por tenant (não global).
  @IsString()
  @IsNotEmpty()
  subdomain!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
