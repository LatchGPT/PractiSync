import { redirect } from 'next/navigation';
import { pageIdentity } from '@/app/server-identity';
import { dashboardPathForRole } from '@/packages/auth/routes';
import { DomainError } from '@/packages/domain/policies';
import { getConsentHistory } from '@/packages/privacy/history';
import { consentPath } from '@/packages/privacy/paths';
import PrivacySettings from '@/app/privacy-settings';
import styles from '@/app/privacy-settings.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Settings · Privacy · PractiSync'};
export default async function PrivacySettingsPage() {
 let user;
 try{user=await pageIdentity(true);}catch(error){if(error instanceof DomainError&&error.status===401)redirect('/login?redirect='+encodeURIComponent('/settings/privacy'));throw error;}
 const initial=await getConsentHistory(user);
 if(initial.state.required)redirect(consentPath('/settings/privacy'));
 return <main className={styles.page}><div className={styles.pageInner}><header className={styles.pageHeader}><a href={dashboardPathForRole(user.role)}>Back to workspace</a><h1>Settings · Privacy</h1></header><PrivacySettings initial={initial}/></div></main>;
}
