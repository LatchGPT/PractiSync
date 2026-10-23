import { one } from '../db/demo';
import { getConsentStatus } from './consent';

export async function workerHasConsent(userId:string|undefined,tenantId:string) {
 if(!userId||!await one("SELECT id FROM users WHERE id=? AND tenant_id=? AND status='ACTIVE'",userId,tenantId))return false;
 return !(await getConsentStatus({id:userId,tenantId})).required;
}
