import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { withTenant } from '@vibesphere/database';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/**
 * Gestão de usuários escopada ao tenant — Requisito 2.5 / 4.3.
 * Todas as operações passam por withTenant (RLS), impedindo acesso cross-tenant.
 */
@Injectable()
export class UserService {
  list(tenantId: string) {
    return withTenant(tenantId, (tx) => tx.user.findMany({ select: PUBLIC_FIELDS }));
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const exists = await withTenant(tenantId, (tx) =>
      tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
      }),
    );
    if (exists) {
      throw new ConflictException('Já existe um usuário com este email neste tenant');
    }

    const passwordHash = await argon2.hash(dto.password);
    return withTenant(tenantId, (tx) =>
      tx.user.create({
        data: {
          tenantId,
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: dto.role,
        },
        select: PUBLIC_FIELDS,
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.ensureExists(tenantId, id);
    return withTenant(tenantId, (tx) =>
      tx.user.update({ where: { id }, data: dto, select: PUBLIC_FIELDS }),
    );
  }

  async remove(tenantId: string, id: string) {
    await this.ensureExists(tenantId, id);
    await withTenant(tenantId, (tx) => tx.user.delete({ where: { id } }));
  }

  private async ensureExists(tenantId: string, id: string) {
    const user = await withTenant(tenantId, (tx) => tx.user.findUnique({ where: { id } }));
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }
}
