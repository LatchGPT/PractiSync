import { z } from 'zod';
import { database, settings, statement } from '../db/demo';
import { initialPrivacyPolicy } from './initial-policy';
import { demoAllowed } from '../domain/policies';

export const privacyPolicyInput = z.object({
 version: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
 titleEn: z.string().trim().min(1).max(300),
 bodyEn: z.string().trim().min(1).max(200_000),
 titleFil: z.string().trim().min(1).max(300),
 bodyFil: z.string().trim().min(1).max(200_000),
 effectiveAt: z.string().datetime({offset:true}).refine(value => Date.parse(value) <= Date.now(), 'A current policy cannot have a future effective date.'),
}).strict();

export type PrivacyPolicyInput = z.infer<typeof privacyPolicyInput>;

/** Never reactivates the initial policy after a later policy has been published. */
export async function seedPrivacyPolicy() {
 const p=initialPrivacyPolicy;
 await statement(`INSERT INTO privacy_policies (id,version,title_en,body_en,title_fil,body_fil,effective_at,is_current)
 SELECT ?,?,?,?,?,?,?,TRUE WHERE NOT EXISTS (SELECT 1 FROM privacy_policies)
 ON CONFLICT (version) DO NOTHING`,p.id,p.version,p.titleEn,p.bodyEn,p.titleFil,p.bodyFil,p.effectiveAt).run();
}

/** Operator-only CLI entry point. All publication changes commit or roll back together. */
export async function publishPrivacyPolicy(input:unknown) {
 const policy=privacyPolicyInput.parse(input);
 const cfg=settings(),sqlite=cfg.PRACTISYNC_LOCAL_DEMO==='true'&&demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED);
 const lock=sqlite?[]:[statement('LOCK TABLE privacy_policies IN EXCLUSIVE MODE')];
 await database().batch([
  ...lock,
  statement('UPDATE privacy_policies SET is_current=FALSE WHERE is_current=TRUE'),
  statement(`INSERT INTO privacy_policies (id,version,title_en,body_en,title_fil,body_fil,effective_at,is_current)
 VALUES (?,?,?,?,?,?,?,TRUE)`,crypto.randomUUID(),policy.version,policy.titleEn,policy.bodyEn,policy.titleFil,policy.bodyFil,policy.effectiveAt),
 ]);
 return policy.version;
}
