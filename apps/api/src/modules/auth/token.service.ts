import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload } from '@vibesphere/shared';
import { withTenant } from '@vibesphere/database';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Emissão e rotação de tokens — Requisito 1.1/1.3/1.4/1.6.
 * O refresh token é opaco (random) e persistido como hash (nunca em texto plano).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issuePair(payload: AuthTokenPayload): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL') ?? 900),
    });

    const refreshToken = randomBytes(48).toString('hex');
    const ttl = Number(this.config.get('JWT_REFRESH_TTL') ?? 2_592_000);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await withTenant(payload.tenantId, (tx) =>
      tx.refreshToken.create({
        data: { userId: payload.sub, tokenHash: this.hash(refreshToken), expiresAt },
      }),
    );

    return { accessToken, refreshToken };
  }

  /**
   * Valida e rotaciona o refresh token: revoga o antigo e emite um novo par.
   */
  async rotate(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(rawToken);

    // Busca cross-tenant controlada (bypass) apenas para localizar o token pelo hash.
    const record = await withTenant(
      null,
      (tx) =>
        tx.refreshToken.findFirst({
          where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
          include: { user: true },
        }),
      { bypassRls: true },
    );

    if (!record) {
      throw new Error('REFRESH_INVALID');
    }

    await withTenant(record.user.tenantId, (tx) =>
      tx.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } }),
    );

    return this.issuePair({
      sub: record.user.id,
      tenantId: record.user.tenantId,
      role: record.user.role,
    });
  }

  async revokeAllForUser(userId: string, tenantId: string): Promise<void> {
    await withTenant(tenantId, (tx) =>
      tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    );
  }
}
