jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

import { PlanLimitService } from '../plan-limit.service';
import { withTenant } from '@vibesphere/database';
import { ForbiddenException } from '@nestjs/common';

describe('PlanLimitService', () => {
  let service: PlanLimitService;

  beforeEach(() => {
    service = new PlanLimitService();
    jest.clearAllMocks();
  });

  describe('getLimits', () => {
    it('should return Starter limits when no subscription', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);

      const limits = await service.getLimits('t1');
      expect(limits.whatsappChannels).toBe(1);
      expect(limits.agents).toBe(3);
      expect(limits.conversationsPerMonth).toBe(1000);
    });

    it('should return plan limits from subscription', async () => {
      (withTenant as jest.Mock).mockResolvedValue({
        plan: { limits: { whatsappChannels: 5, agents: 20, conversationsPerMonth: 20000 } },
      });

      const limits = await service.getLimits('t1');
      expect(limits.whatsappChannels).toBe(5);
      expect(limits.agents).toBe(20);
      expect(limits.conversationsPerMonth).toBe(20000);
    });

    it('should convert -1 (DB unlimited) to Infinity', async () => {
      (withTenant as jest.Mock).mockResolvedValue({
        plan: { limits: { whatsappChannels: -1, agents: -1, conversationsPerMonth: -1 } },
      });

      const limits = await service.getLimits('t1');
      expect(limits.whatsappChannels).toBe(Number.POSITIVE_INFINITY);
      expect(limits.agents).toBe(Number.POSITIVE_INFINITY);
      expect(limits.conversationsPerMonth).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('getUsage', () => {
    it('should count agents', async () => {
      (withTenant as jest.Mock).mockResolvedValue(5);
      const count = await service.getUsage('t1', 'agents');
      expect(count).toBe(5);
    });

    it('should count whatsappChannels', async () => {
      (withTenant as jest.Mock).mockResolvedValue(2);
      const count = await service.getUsage('t1', 'whatsappChannels');
      expect(count).toBe(2);
    });

    it('should count conversationsPerMonth', async () => {
      (withTenant as jest.Mock).mockResolvedValue(100);
      const count = await service.getUsage('t1', 'conversationsPerMonth');
      expect(count).toBe(100);
    });
  });

  describe('assertCanCreate', () => {
    it('should allow when under limit', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ plan: { limits: { agents: 3 } } }) // getLimits
        .mockResolvedValueOnce(1); // getUsage

      await expect(service.assertCanCreate('t1', 'agents')).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when at limit', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ plan: { limits: { agents: 3 } } })
        .mockResolvedValueOnce(3);

      await expect(service.assertCanCreate('t1', 'agents')).rejects.toThrow(ForbiddenException);
    });

    it('should allow when unlimited', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ plan: { limits: { agents: -1 } } });

      await expect(service.assertCanCreate('t1', 'agents')).resolves.toBeUndefined();
    });
  });
});
