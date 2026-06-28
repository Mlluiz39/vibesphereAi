import { Role, ROLE_RANK, roleAtLeast } from '../src/roles';

describe('Role', () => {
  it('should have correct enum values', () => {
    expect(Role.SUPER_ADMIN).toBe('super_admin');
    expect(Role.OWNER).toBe('owner');
    expect(Role.MANAGER).toBe('manager');
    expect(Role.ATTENDANT).toBe('attendant');
  });
});

describe('ROLE_RANK', () => {
  it('should have descending ranks', () => {
    expect(ROLE_RANK[Role.SUPER_ADMIN]).toBeGreaterThan(ROLE_RANK[Role.OWNER]);
    expect(ROLE_RANK[Role.OWNER]).toBeGreaterThan(ROLE_RANK[Role.MANAGER]);
    expect(ROLE_RANK[Role.MANAGER]).toBeGreaterThan(ROLE_RANK[Role.ATTENDANT]);
  });

  it('should have specific values', () => {
    expect(ROLE_RANK[Role.SUPER_ADMIN]).toBe(100);
    expect(ROLE_RANK[Role.OWNER]).toBe(80);
    expect(ROLE_RANK[Role.MANAGER]).toBe(60);
    expect(ROLE_RANK[Role.ATTENDANT]).toBe(40);
  });
});

describe('roleAtLeast', () => {
  it('should return true when role meets minimum', () => {
    expect(roleAtLeast(Role.SUPER_ADMIN, Role.OWNER)).toBe(true);
    expect(roleAtLeast(Role.OWNER, Role.MANAGER)).toBe(true);
    expect(roleAtLeast(Role.MANAGER, Role.ATTENDANT)).toBe(true);
  });

  it('should return true when role equals minimum', () => {
    expect(roleAtLeast(Role.OWNER, Role.OWNER)).toBe(true);
    expect(roleAtLeast(Role.ATTENDANT, Role.ATTENDANT)).toBe(true);
  });

  it('should return false when role is below minimum', () => {
    expect(roleAtLeast(Role.ATTENDANT, Role.MANAGER)).toBe(false);
    expect(roleAtLeast(Role.MANAGER, Role.OWNER)).toBe(false);
    expect(roleAtLeast(Role.OWNER, Role.SUPER_ADMIN)).toBe(false);
  });

  it('should handle SUPER_ADMIN as highest rank', () => {
    expect(roleAtLeast(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    expect(roleAtLeast(Role.ATTENDANT, Role.SUPER_ADMIN)).toBe(false);
  });
});
