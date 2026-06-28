jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

import { AgentService } from '../agent.service';
import { withTenant } from '@vibesphere/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list agents', async () => {
      const mockAgents = [{ id: 'a1', name: 'SDR' }];
      (withTenant as jest.Mock).mockResolvedValue(mockAgents);

      const result = await service.list('t1');
      expect(result).toEqual(mockAgents);
    });
  });

  describe('get', () => {
    it('should return agent by id', async () => {
      const mockAgent = { id: 'a1', name: 'SDR' };
      (withTenant as jest.Mock).mockResolvedValue(mockAgent);

      const result = await service.get('t1', 'a1');
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException when not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.get('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create agent with defaults', async () => {
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'a1',
        name: 'SDR',
        temperature: 0.7,
        provider: 'openai',
        model: 'gpt-4o-mini',
      });

      const result = await service.create('t1', { name: 'SDR', systemPrompt: 'Be helpful' });
      expect(result.name).toBe('SDR');
    });

    it('should create agent with custom settings', async () => {
      (withTenant as jest.Mock).mockResolvedValue({
        id: 'a1',
        name: 'SDR',
        temperature: 0.3,
        provider: 'deepseek',
        model: 'deepseek-chat',
      });

      const result = await service.create('t1', {
        name: 'SDR',
        systemPrompt: 'Be helpful',
        temperature: 0.3,
        provider: 'deepseek' as any,
        model: 'deepseek-chat',
      });
      expect(result.temperature).toBe(0.3);
    });

    it('should validate knowledgeBaseId', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null); // KB not found

      await expect(
        service.create('t1', { name: 'SDR', systemPrompt: 'x', knowledgeBaseId: 'kb-invalid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create agent with valid knowledgeBaseId', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'kb1' }) // KB check
        .mockResolvedValueOnce({ id: 'a1', name: 'SDR', knowledgeBaseId: 'kb1' }); // create

      const result = await service.create('t1', {
        name: 'SDR',
        systemPrompt: 'x',
        knowledgeBaseId: 'kb1',
      });
      expect(result.knowledgeBaseId).toBe('kb1');
    });
  });

  describe('update', () => {
    it('should update agent', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'a1' }) // get check
        .mockResolvedValueOnce({ id: 'a1', name: 'Updated' }); // update

      const result = await service.update('t1', 'a1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when agent not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.update('t1', 'nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete agent', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'a1' })
        .mockResolvedValueOnce(undefined);

      await service.remove('t1', 'a1');
      expect(withTenant).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when agent not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
