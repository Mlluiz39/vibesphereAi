jest.mock('@vibesphere/database', () => ({
  withTenant: jest.fn(),
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

import { UserService } from '../user.service';
import { withTenant } from '@vibesphere/database';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@vibesphere/shared';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list users for tenant', async () => {
      const mockUsers = [{ id: 'u1', email: 'a@b.com', name: 'A', role: 'owner', status: 'active' }];
      (withTenant as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.list('t1');
      expect(result).toEqual(mockUsers);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce(null) // findUnique check
        .mockResolvedValueOnce({ id: 'u1', email: 'a@b.com', name: 'A', role: 'owner', status: 'active' }); // create

      const result = await service.create('t1', {
        email: 'a@b.com',
        password: 'pass123',
        name: 'A',
        role: Role.OWNER,
      });

      expect(result.id).toBe('u1');
    });

    it('should throw ConflictException if email exists', async () => {
      (withTenant as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('t1', { email: 'a@b.com', password: 'pass', name: 'A', role: Role.OWNER }),
      ).rejects.toThrow(ConflictException);
    });

    it('should lowercase email', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });

      await service.create('t1', { email: 'A@B.COM', password: 'pass', name: 'A', role: Role.OWNER });

      expect(withTenant).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'u1' }) // ensureExists
        .mockResolvedValueOnce({ id: 'u1', name: 'Updated' }); // update

      const result = await service.update('t1', 'u1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException if user not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.update('t1', 'nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      (withTenant as jest.Mock)
        .mockResolvedValueOnce({ id: 'u1' }) // ensureExists
        .mockResolvedValueOnce(undefined); // delete

      await service.remove('t1', 'u1');
      expect(withTenant).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      (withTenant as jest.Mock).mockResolvedValue(null);
      await expect(service.remove('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
