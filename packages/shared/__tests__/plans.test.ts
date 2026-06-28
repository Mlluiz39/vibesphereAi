import { PlanCode, PLAN_LIMITS, isWithinLimit } from '../src/plans';

describe('PlanCode', () => {
  it('should have correct enum values', () => {
    expect(PlanCode.STARTER).toBe('starter');
    expect(PlanCode.PRO).toBe('pro');
    expect(PlanCode.ENTERPRISE).toBe('enterprise');
  });
});

describe('PLAN_LIMITS', () => {
  it('should have limits for all plans', () => {
    expect(PLAN_LIMITS[PlanCode.STARTER]).toBeDefined();
    expect(PLAN_LIMITS[PlanCode.PRO]).toBeDefined();
    expect(PLAN_LIMITS[PlanCode.ENTERPRISE]).toBeDefined();
  });

  it('Starter should have correct limits', () => {
    const limits = PLAN_LIMITS[PlanCode.STARTER];
    expect(limits.whatsappChannels).toBe(1);
    expect(limits.agents).toBe(3);
    expect(limits.conversationsPerMonth).toBe(1000);
  });

  it('Pro should have correct limits', () => {
    const limits = PLAN_LIMITS[PlanCode.PRO];
    expect(limits.whatsappChannels).toBe(5);
    expect(limits.agents).toBe(20);
    expect(limits.conversationsPerMonth).toBe(20000);
  });

  it('Enterprise should have unlimited limits', () => {
    const limits = PLAN_LIMITS[PlanCode.ENTERPRISE];
    expect(limits.whatsappChannels).toBe(Number.POSITIVE_INFINITY);
    expect(limits.agents).toBe(Number.POSITIVE_INFINITY);
    expect(limits.conversationsPerMonth).toBe(Number.POSITIVE_INFINITY);
  });

  it('Pro should have higher limits than Starter', () => {
    expect(PLAN_LIMITS[PlanCode.PRO].whatsappChannels).toBeGreaterThan(
      PLAN_LIMITS[PlanCode.STARTER].whatsappChannels,
    );
    expect(PLAN_LIMITS[PlanCode.PRO].agents).toBeGreaterThan(
      PLAN_LIMITS[PlanCode.STARTER].agents,
    );
    expect(PLAN_LIMITS[PlanCode.PRO].conversationsPerMonth).toBeGreaterThan(
      PLAN_LIMITS[PlanCode.STARTER].conversationsPerMonth,
    );
  });
});

describe('isWithinLimit', () => {
  it('should return true when current is below limit', () => {
    expect(isWithinLimit(0, 5)).toBe(true);
    expect(isWithinLimit(4, 5)).toBe(true);
  });

  it('should return false when current equals limit', () => {
    expect(isWithinLimit(5, 5)).toBe(false);
  });

  it('should return false when current exceeds limit', () => {
    expect(isWithinLimit(6, 5)).toBe(false);
    expect(isWithinLimit(100, 10)).toBe(false);
  });

  it('should handle zero limit', () => {
    expect(isWithinLimit(0, 0)).toBe(false);
    expect(isWithinLimit(-1, 0)).toBe(true);
  });

  it('should handle Infinity limit', () => {
    expect(isWithinLimit(999999, Number.POSITIVE_INFINITY)).toBe(true);
  });
});
