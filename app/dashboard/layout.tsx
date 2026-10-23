import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { pageIdentity } from '@/app/server-identity';
import { DomainError } from '@/packages/domain/policies';
import { requirePageConsent } from '@/packages/privacy/page-guard';
import { safeInternalPath } from '@/packages/auth/routes';

export default async function ProtectedDashboardLayout({children}:{children:React.ReactNode}) {
 const returnTo=safeInternalPath((await headers()).get('x-practisync-return-to'))??'/';
 let user;
 try{user=await pageIdentity(true);}catch(error){if(error instanceof DomainError&&error.status===401)redirect('/login?redirect='+encodeURIComponent(returnTo));throw error;}
 await requirePageConsent(user,returnTo);
 return children;
}
