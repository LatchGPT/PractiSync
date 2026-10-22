import { Mail, Phone } from 'lucide-react';
import type { Row } from '@/packages/validation/contracts';
import { emailApplicantHref } from '@/packages/validation/recruitment';

export default function ApplicantContact({ application }: { application: Row }) {
 const email = String(application.studentEmail ?? '');
 const phone = String(application.contactPhone ?? '');
 const href = emailApplicantHref(email, String(application.title ?? ''));
 return <div className="applicant-contact"><span><Mail size={14}/>{email || 'Email unavailable'}</span>{phone && <span><Phone size={14}/>{phone}</span>}{href && <a className="textbutton" href={href}><Mail size={14}/>Email applicant</a>}</div>;
}
