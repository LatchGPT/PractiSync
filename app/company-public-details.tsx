import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { Row } from '@/packages/validation/contracts';
import { recruitmentCompanyProfiles } from '@/packages/db/recruitment-company-profiles';

export default function CompanyPublicDetails({ company }: { company: Row }) {
  const website = String(company.website || '');
  const email = String(company.contactEmail || '');
  const phone = String(company.contactPhone || '');
  const safeWebsite = /^https?:\/\//i.test(website) ? website : '';
  const safeEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !/[\r\n?&#]/.test(email) ? email : '';
  const profile = recruitmentCompanyProfiles.find(item => item.id === company.id);
  return <section className="company-public-details" aria-label="Public company information">
    <div className="applicant-contact">
      <span><MapPin size={16}/>{String(company.location || 'Location not provided')}</span>
      {safeWebsite && <a href={safeWebsite} target="_blank" rel="noopener noreferrer"><Globe size={16}/>{website.includes('linkedin.com') ? 'Company LinkedIn Profile' : 'Company Website'}</a>}
      {safeEmail && <a href={`mailto:${encodeURIComponent(safeEmail)}`}><Mail size={16}/>{email}</a>}
      {phone && <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Phone size={16}/>{phone}</a>}
    </div>
    {(safeEmail || phone) && <p className="small muted">General company contact; internship contact not verified.</p>}
    {profile && <details className="company-public-sources"><summary>Public Sources · 24 Oct 2026</summary><ul>{profile.sources.map(source => <li key={source}><a href={source} target="_blank" rel="noopener noreferrer">{new URL(source).hostname.replace(/^www\./,'')}</a></li>)}</ul></details>}
  </section>;
}
