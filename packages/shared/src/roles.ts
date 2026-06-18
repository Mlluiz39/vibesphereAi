/**
 * Perfis de usuário (RBAC) — Requisito 2.
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  ATTENDANT = 'attendant',
}

/**
 * Hierarquia de poder dos perfis (maior = mais permissões).
 * Útil para checagens "pelo menos este nível".
 */
export const ROLE_RANK: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.OWNER]: 80,
  [Role.MANAGER]: 60,
  [Role.ATTENDANT]: 40,
};

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
