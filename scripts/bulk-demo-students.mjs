import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith('--') || !value || value.startsWith('--')) {
    throw new Error('Use --tenant ID --course ID --count NUMBER [--dry-run true].');
  }
  options.set(flag, value);
}
const tenantId = options.get('--tenant');
const courseId = options.get('--course');
const count = Number(options.get('--count'));
const dryRun = options.get('--dry-run') === 'true';
if (!tenantId || !courseId || !Number.isSafeInteger(count) || count < 1 || count > 100000) {
  throw new Error('Provide tenant, course, and a count from 1 to 100000.');
}
if ([...options.keys()].some(key => !['--tenant', '--course', '--count', '--dry-run'].includes(key))) {
  throw new Error('Unknown bulk fixture option.');
}

const namespace = createHash('sha256').update(tenantId).digest('hex').slice(0, 10);
function fixture(number) {
  const serial = String(number).padStart(6, '0');
  const id = `bulk-${namespace}-${serial}`;
  return {
    user: { id, tenantId, name: `Synthetic Student ${serial}`, username: id, email: `${id}@example.invalid`, isDemo: true, passwordHash: null },
    membership: { id: `member-${id}`, tenantId, userId: id, role: 'STUDENT' },
    profile: { id: `profile-${id}`, tenantId, userId: id, courseId, studentNumber: `B${namespace}${serial}` },
  };
}

if (dryRun) {
  console.log(JSON.stringify({ count, first: fixture(1), last: fixture(count) }, null, 2));
  process.exit(0);
}
if (process.env.DEPLOYMENT_MODE !== 'demo' || process.env.DEMO_ENABLED !== 'true' || process.env.BULK_DEMO_CONFIRM !== 'synthetic-only') {
  throw new Error('Bulk fixtures require DEPLOYMENT_MODE=demo, DEMO_ENABLED=true, and BULK_DEMO_CONFIRM=synthetic-only.');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const prisma = new PrismaClient();
try {
  const [tenant, course] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { mode: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { tenantId: true, archivedAt: true } }),
  ]);
  if (tenant?.mode !== 'DEMO' || course?.tenantId !== tenantId || course.archivedAt) {
    throw new Error('The tenant must be DEMO and the course must be active within that tenant.');
  }
  for (let start = 1; start <= count; start += 500) {
    const batch = Array.from({ length: Math.min(500, count - start + 1) }, (_, offset) => fixture(start + offset));
    await prisma.user.createMany({ data: batch.map(row => row.user), skipDuplicates: true });
    await prisma.membership.createMany({ data: batch.map(row => row.membership), skipDuplicates: true });
    await prisma.studentProfile.createMany({ data: batch.map(row => row.profile), skipDuplicates: true });
    console.log(`Synthetic students processed: ${Math.min(start + batch.length - 1, count)}/${count}`);
  }
} finally {
  await prisma.$disconnect();
}
