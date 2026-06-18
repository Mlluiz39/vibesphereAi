import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PlanCode, Role } from '@vibesphere/shared';
import { prisma, withTenant } from '@vibesphere/database';
import { TokenPair, TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterTenantDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registro de empresa: cria tenant + Owner + subscription do plano Starter.
   * Requisitos 3.5, 4.1, 4.2.
   */
  async registerTenant(dto: RegisterTenantDto): Promise<{ tenantId: string }> {
    const existing = await prisma.tenant.findUnique({ where: { subdomain: dto.subdomain } });
    if (existing) {
      throw new ConflictException('subdomain já está em uso');
    }

    const passwordHash = await argon2.hash(dto.ownerPassword);
    const starter = await prisma.plan.findUnique({ where: { code: PlanCode.STARTER } });

    // Provisionamento de um novo tenant insere em tabelas com RLS antes de existir
    // contexto de tenant; por isso roda com bypassRls (operação de plataforma).
    const tenant = await withTenant(
      null,
      (tx) =>
        tx.tenant.create({
          data: {
            name: dto.companyName,
            subdomain: dto.subdomain,
            users: {
              create: {
                email: dto.ownerEmail.toLowerCase(),
                passwordHash,
                name: dto.ownerName,
                role: Role.OWNER,
              },
            },
            ...(starter
              ? { subscriptions: { create: { planId: starter.id, status: 'active' } } }
              : {}),
          },
        }),
      { bypassRls: true },
    );

    await this.audit.log({ tenantId: tenant.id, action: 'tenant.register', resource: 'tenant' });
    return { tenantId: tenant.id };
  }

  /**
   * Login: valida credenciais e emite par de tokens — Requisito 1.1/1.2.
   * Mensagem de erro genérica para não revelar existência do email — Requisito 1.2.
   */
  async login(dto: LoginDto): Promise<TokenPair> {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: dto.subdomain } });
    const genericError = new UnauthorizedException('Credenciais inválidas');
    if (!tenant) {
      throw genericError;
    }

    const user = await withTenant(tenant.id, (tx) =>
      tx.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() } } }),
    );

    if (!user || user.status !== 'active') {
      throw genericError;
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.audit.log({ tenantId: tenant.id, action: 'auth.login_failed', resource: 'user' });
      throw genericError;
    }

    await this.audit.log({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'auth.login',
      resource: 'user',
    });

    return this.tokens.issuePair({ sub: user.id, tenantId: user.tenantId, role: user.role });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      return await this.tokens.rotate(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string, tenantId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId, tenantId);
    await this.audit.log({ tenantId, actorUserId: userId, action: 'auth.logout', resource: 'user' });
  }
}
