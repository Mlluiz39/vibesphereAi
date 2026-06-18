import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS, PlanCode } from '@vibesphere/shared';

const prisma = new PrismaClient();

async function main() {
  // Seed dos planos — Requisito 10.1
  const plans: { code: PlanCode; name: string }[] = [
    { code: PlanCode.STARTER, name: 'Starter' },
    { code: PlanCode.PRO, name: 'Pro' },
    { code: PlanCode.ENTERPRISE, name: 'Enterprise' },
  ];

  for (const p of plans) {
    const limits = PLAN_LIMITS[p.code];
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name, limits: serializeLimits(limits) },
      create: { code: p.code, name: p.name, limits: serializeLimits(limits) },
    });
    console.log(`Plano garantido: ${p.code}`);
  }
}

// Infinity não é serializável em JSON; persistimos como -1 = ilimitado.
function serializeLimits(limits: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(limits).map(([k, v]) => [k, Number.isFinite(v) ? v : -1]),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
