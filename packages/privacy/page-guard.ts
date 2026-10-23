import 'server-only';
import { redirect } from 'next/navigation';
import { ConsentRequired, requireConsent, type ConsentSubject } from './consent';
import { consentPath } from './paths';

export async function requirePageConsent(user:ConsentSubject,returnTo:string) {
 try{await requireConsent(user);}catch(error){if(error instanceof ConsentRequired)redirect(consentPath(returnTo));throw error;}
}
