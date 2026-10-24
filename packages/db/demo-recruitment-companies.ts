import { recruitmentCompanyProfiles } from './recruitment-company-profiles';
import type { DemoDatabase } from './demo';
import { TENANT } from '../domain/policies';

export const recruitmentCompanyFixtures = recruitmentCompanyProfiles.map(profile => [profile.id, profile.name] as const);

/** Demo directory fixtures only; no invented vacancies, contacts, or locations. */
export async function seedDemoRecruitmentCompanies(db: DemoDatabase) {
  const now = new Date().toISOString();
  await db.batch(recruitmentCompanyProfiles.map(profile => db.prepare(`
    INSERT OR IGNORE INTO companies (id,tenant_id,created_at,name,industry,location,status,can_post,description,website,contact_email,contact_phone,contact_position)
    SELECT ?,?,?,?,?,?,'APPROVED',0,?,?,?,?,?
    WHERE NOT EXISTS (SELECT 1 FROM companies WHERE tenant_id=? AND LOWER(TRIM(name))=LOWER(TRIM(?)))
  `).bind(profile.id,TENANT,now,profile.name,profile.industry,profile.location,profile.description,profile.website,profile.contactEmail,profile.contactPhone,profile.contactEmail||profile.contactPhone?'General company contact':'',TENANT,profile.name)));
}
