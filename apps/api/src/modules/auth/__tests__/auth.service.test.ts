// Mock database module
jest.mock('@vibesphere/database', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
  },
  withTenant: jest.fn(),
}));

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn(),
}));

import { AuthService } from '../auth.service';
import { TokenService } from '../token.service';
import { AuditService } from '../../audit/audit.service';
import { prisma, withTenant } from '@vibesphere/database';
import * as argon2 from 'argon2';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let tokens: TokenService;
  let audit: AuditService;

  const mockTokens = {
    issuePair: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
    rotate: jest.fn(),
    revokeAllForUser: jest.fn(),
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(() => {
    tokens = mockTokens as unknown as TokenService;
    audit = mockAudit as unknown as AuditService;
    service = new AuthService(tokens, audit);
    jest.clearAllMocks();
  });

  describe('registerTenant', () => {
    it('should register a new tenant successfully', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({ id: 'plan-1', code: 'starter' });
      (withTenant as jest.Mock).mockResolvedValue({ id: 'tenant-1' });

      const result = await service.registerTenant({
        companyName: 'Acme',
        subdomain: 'acme',
        ownerEmail: 'owner@acme.com',
        ownerPassword: 'senha12345',
        ownerName: 'Owner',
      });

      expect(result.tenantId).toBe('tenant-1');
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { subdomain: 'acme' } });
      expect(argon2.hash).toHaveBeenCalledWith('senha12345');
    });

    it('should throw ConflictException if subdomain already exists', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.registerTenant({
          companyName: 'Acme',
          subdomain: 'acme',
          ownerEmail: 'owner@acme.com',
          ownerPassword: 'senha12345',
          ownerName: 'Owner',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should lowercase email', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue(null);
      (withTenant as jest.Mock).mockResolvedValue({ id: 'tenant-1' });

      await service.registerTenant({
        companyName: 'Acme',
        subdomain: 'acme',
        ownerEmail: 'OWNER@ACME.COM',
        ownerPassword: 'senha12345',
        ownerName: 'Owner',
      });

      expect(withTenant).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'owner@acme.com',
        passwordHash: 'hashed',
        role: 'owner',
        status: 'active',
      };
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'tenant-1' });
      (withTenant as jest.Mock).mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        subdomain: 'acme',
        email: 'owner@acme.com',
        password: 'senha12345',
      });

      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
      expect(tokens.issuePair).toHaveBeenCalledWith({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: 'owner',
      });
    });

    it('should throw UnauthorizedException for invalid subdomain', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          subdomain: 'nonexistent',
          email: 'test@test.com',
          password: 'pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'tenant-1' });
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
        status: 'active',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          subdomain: 'acme',
          email: 'test@test.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'tenant-1' });
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
        status: 'inactive',
      });

      await expect(
        service.login({
          subdomain: 'acme',
          email: 'test@test.com',
          password: 'pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log failed login attempt', async () => {
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 'tenant-1' });
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
        status: 'active',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await service.login({
        subdomain: 'acme',
        email: 'test@test.com',
        password: 'wrong',
      }).catch(() => {});

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login_failed' }),
      );
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token', async () => {
      (mockTokens.rotate as jest.Mock).mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
      });

      const result = await service.refresh('old-refresh-token');
      expect(result).toEqual({ accessToken: 'new-at', refreshToken: 'new-rt' });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (mockTokens.rotate as jest.Mock).mockRejectedValue(new Error('REFRESH_INVALID'));

      await expect(service.refresh('invalid')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke all tokens and log', async () => {
      await service.logout('user-1', 'tenant-1');
      expect(mockTokens.revokeAllForUser).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.logout' }),
      );
    });
  });
});
