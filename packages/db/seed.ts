import { pathToFileURL } from 'node:url';
import { prisma } from './client';
import { seed } from './demo';

export { seed } from './demo';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await seed();
    console.log('Fictional PractiSync demo data is ready.');
  } finally {
    await prisma.$disconnect();
  }
}
