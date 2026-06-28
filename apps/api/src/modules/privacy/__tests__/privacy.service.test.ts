jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

import { PrivacyService } from '../privacy.service';
import { withTenant } from '@vibesphere/database';
import { NotFoundException } from '@nestjs/common';

describe('PrivacyService', () => {
  let service: PrivacyService;
  const mockAudit = { log: jest.fn() };

  beforeEach(() => {
    service = new PrivacyService(mockAudit as any);
    jest.clearAllMocks();
  });

  describe('anonymizeContact', () => {
    it('should anonymize contact', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'c1', phone: '5511999999999' }) // ensureContact
        .mockResolvedValueOnce({ id: 'c1' }); // update

      const result = await service.anonymizeContact('t1', 'c1', 'user-1');
      expect(result.anonymized).toBe(true);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'privacy.anonymize_contact' }),
      );
    });

    it('should throw NotFoundException when contact not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.anonymizeContact('t1', 'nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteContact', () => {
    it('should delete contact', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'c1' }) // ensureContact
        .mockResolvedValueOnce(undefined); // delete

      const result = await service.deleteContact('t1', 'c1', 'user-1');
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException when contact not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteContact('t1', 'nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
