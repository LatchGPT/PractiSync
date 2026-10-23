import { redirect } from 'next/navigation';
import { pageIdentity } from '@/app/server-identity';
import { dashboardPathForRole } from '@/packages/auth/routes';
import { DomainError } from '@/packages/domain/policies';
import { currentPrivacyPolicy, getConsentStatus } from '@/packages/privacy/consent';
import { consentReturnPath } from '@/packages/privacy/paths';
import ConsentForm from './consent-form';
import './privacy.css';

export const dynamic='force-dynamic';
export const metadata={title:'Privacy consent · PractiSync'};
export default async function ConsentPage({searchParams}:{searchParams:Promise<{redirect?:string|string[]}>}) {
 const query=await searchParams,requested=Array.isArray(query.redirect)?query.redirect[0]:query.redirect;
 let user;
 try{user=await pageIdentity(true,true);}catch(error){if(error instanceof DomainError&&error.status===401)redirect('/login?redirect='+encodeURIComponent('/consent'+(requested?'?redirect='+encodeURIComponent(requested):'')));throw error;}
 const state=await getConsentStatus(user),policy=await currentPrivacyPolicy();
 if(state.policy.version!==policy.version)redirect('/consent'+(requested?'?redirect='+encodeURIComponent(requested):''));
 return <ConsentForm key={policy.version} policy={policy} state={state} returnTo={consentReturnPath(requested,dashboardPathForRole(user.role))}/>;
}
