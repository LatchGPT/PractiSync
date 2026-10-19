import { prisma } from '../packages/db/client';
import { installPublishedRecommendationTemplate } from '../packages/documents/native-template-seed';

try {
  await installPublishedRecommendationTemplate();
} finally {
  await prisma.$disconnect();
}
