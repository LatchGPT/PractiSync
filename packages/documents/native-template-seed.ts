import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { demoAllowed, DomainError } from '../domain/policies';
import { database, one, settings } from '../db/demo';
import type { Identity } from '../validation/contracts';
import { scanDocx } from './native-infrastructure';
import { createNativeTemplate, saveNativeFields } from './native-repository';
import { nativeFieldSchema } from './native-types';

const manifestSchema = z.object({
  name: z.string().min(1), filename: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  fields: z.array(nativeFieldSchema).min(1).max(80),
});

/** Install the packaged published recommendation template into a fictional demo database. */
export async function installPublishedRecommendationTemplate() {
  const config = settings();
  if (!demoAllowed(config.DEPLOYMENT_MODE, config.DEMO_ENABLED)) {
    throw new DomainError('The published demo template can only be installed when demo access is enabled.', 403);
  }

  const manifestPath = join(process.cwd(), 'packages/documents/fixtures/published-recommendation.json');
  const documentPath = join(process.cwd(), 'packages/documents/fixtures/published-recommendation.docx');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  const bytes = await readFile(documentPath);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== manifest.sha256) throw new Error('Packaged recommendation document does not match its manifest.');

  const existing = await one(
    "SELECT id FROM native_document_templates WHERE tenant_id=? AND name=? AND status='ACTIVE' LIMIT 1",
    'fictional-university', manifest.name,
  );
  if (existing) {
    console.log(`${manifest.name} already exists; keeping the configured database version.`);
    return;
  }

  const admin = await one("SELECT * FROM users WHERE tenant_id=? AND role='SUPER_ADMIN' ORDER BY created_at LIMIT 1", 'fictional-university');
  if (!admin) throw new Error('Run pnpm db:seed before installing the published recommendation template.');
  const identity = { id: String(admin.id), tenantId: String(admin.tenantId), role: 'SUPER_ADMIN' } as Identity;

  await database();
  await scanDocx(bytes);
  const version = await createNativeTemplate(identity, manifest.filename, bytes, manifest.fields, manifest.name);
  await saveNativeFields(identity, version, manifest.fields, true);
  console.log(`Published ${manifest.name} with ${manifest.fields.length} fields.`);
}
