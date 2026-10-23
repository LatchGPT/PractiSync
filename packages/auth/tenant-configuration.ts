import { one } from '../db/demo';
import { runtimeTenantId } from './runtime';
import { DomainError } from '../domain/policies';
export async function assertConfiguredTenant(){
 const tenantId=runtimeTenantId();
 if(process.env.DEPLOYMENT_MODE==='institutional'&&!await one('SELECT id FROM "Tenant" WHERE id=? AND mode=\'INSTITUTIONAL\'',tenantId))throw new DomainError('The institutional university database has not been provisioned. Contact the application administrator.',503);
 return tenantId;
}
