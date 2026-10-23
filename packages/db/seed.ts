import { pathToFileURL } from 'node:url';
import { prisma } from './client';
import { seed } from './demo';
import { seedPrivacyPolicy } from '../privacy/publish';

export { seed } from './demo';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await seed();
    await seedPrivacyPolicy();
    console.log('Fictional PractiSync demo data is ready.');
  } finally {
    await prisma.$disconnect();
  }
}
