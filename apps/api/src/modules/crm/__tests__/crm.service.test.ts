jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

import { CrmService } from '../crm.service';
import { withTenant } from '@vibesphere/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CrmService', () => {
  let service: CrmService;
  const mockAudit = { log: jest.fn() };

  beforeEach(() => {
    service = new CrmService(mockAudit as any);
    jest.clearAllMocks();
  });

  describe('listLeads', () => {
    it('should list leads', async () => {
      const mockLeads = [{ id: 'l1', name: 'Lead 1' }];
      (withTenant as jest.Mock).mockResolvedValue(mockLeads);

      const result = await service.listLeads('t1');
      expect(result).toEqual(mockLeads);
    });

    it('should filter by status', async () => {
      (withTenant as jest.Mock).mockResolvedValue([]);
      await service.listLeads('t1', 'new');
      expect(withTenant).toHaveBeenCalled();
    });
  });

  describe('createLead', () => {
    it('should create a lead', async () => {
      (withTenant as jest.Mock).mockResolvedValue({ id: 'l1', name: 'Lead' });
      const result = await service.createLead('t1', { name: 'Lead' });
      expect(result.id).toBe('l1');
    });

    it('should validate contactId if provided', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(
        service.createLead('t1', { name: 'Lead', contactId: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPipeline', () => {
    it('should create pipeline with default stages', async () => {
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'p1',
        name: 'Sales',
        stages: [{ name: 'Novo' }, { name: 'Qualificado' }],
      });

      const result = await service.createPipeline('t1', { name: 'Sales' });
      expect(result.stages.length).toBeGreaterThan(0);
    });
  });

  describe('moveStage', () => {
    it('should move opportunity to new stage', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'o1', pipelineId: 'p1', stageId: 's1' }) // findUnique
        .mockResolvedValueOnce({ id: 's2' }) // ensureStage
        .mockResolvedValueOnce({ id: 'o1', stageId: 's2' }); // update

      const result = await service.moveStage('t1', 'o1', 's2', 'user-1');
      expect(result.stageId).toBe('s2');
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.moveStage('t1', 'nonexistent', 's2', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
