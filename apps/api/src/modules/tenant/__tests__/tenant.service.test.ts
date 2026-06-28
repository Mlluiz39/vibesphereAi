jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

import { TenantService } from '../tenant.service';
import { withTenant } from '@vibesphere/database';
import { NotFoundException } from '@nestjs/common';

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(() => {
    service = new TenantService();
    jest.clearAllMocks();
  });

  describe('getCurrent', () => {
    it('should return tenant data', async () => {
      const mockTenant = { id: 't1', name: 'Acme', subdomain: 'acme', branding: {}, status: 'active' };
      (withTenant as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.getCurrent('t1');
      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.getCurrent('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBranding', () => {
    it('should update branding', async () => {
      const mockUpdated = { id: 't1', branding: { logo: 'url' } };
      (withTenant as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await service.updateBranding('t1', { logo: 'url' });
      expect(result).toEqual(mockUpdated);
    });
  });
});
