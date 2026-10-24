import { recruitmentCompanyProfiles } from '../packages/db/recruitment-company-profiles';
import { prisma } from '../packages/db/client';
import { database } from '../packages/db/demo';
import { recruitmentCompanyFixtures, seedDemoRecruitmentCompanies } from '../packages/db/demo-recruitment-companies';
import { TENANT } from '../packages/domain/policies';

try {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT }, select: { mode: true } });
  if (tenant?.mode !== 'DEMO') throw new Error('Recruitment fixtures require the existing demo tenant.');
  await seedDemoRecruitmentCompanies(database());
  const db = database();
  await db.batch(recruitmentCompanyProfiles.map(profile => db.prepare(`
    UPDATE companies SET name=?,industry=?,location=?,description=?,website=?,contact_email=?,contact_phone=?,contact_position=?,version=version+1
    WHERE tenant_id=? AND id=?
  `).bind(profile.name,profile.industry,profile.location,profile.description,profile.website,profile.contactEmail,profile.contactPhone,profile.contactEmail||profile.contactPhone?'General company contact':'',TENANT,profile.id)));
  console.log(`Recruitment directory populated with ${recruitmentCompanyFixtures.length} requested company names. Existing records preserved.`);
} finally {
  await prisma.$disconnect();
}
