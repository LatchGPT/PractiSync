import { installRecommendationReference } from '../packages/documents/native-reference';
import { documentQueue } from '../packages/documents/native-queue';
try{await installRecommendationReference();const q=documentQueue();await Promise.all([q.queue.close(),q.events.close(),q.redis.quit()]);process.exit(0);}catch(error){console.error(error instanceof Error?error.message:error);process.exit(1);}
