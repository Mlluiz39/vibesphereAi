import { SetMetadata } from '@nestjs/common';
import { Role } from '@vibesphere/shared';

export const ROLES_KEY = 'roles';

/** Restringe a rota aos perfis informados — Requisito 2.2. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
