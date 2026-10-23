import { DomainError, TENANT, demoAllowed } from '../domain/policies';

export function runtimeTenantId(): string {
 if (demoAllowed(process.env.DEPLOYMENT_MODE,process.env.DEMO_ENABLED)) return TENANT;
 const tenant=process.env.INSTITUTIONAL_TENANT_ID?.trim();
 if (process.env.DEPLOYMENT_MODE!=='institutional'||process.env.INSTITUTIONAL_ENABLED!=='true'||!tenant||tenant===TENANT) throw new DomainError('Institutional access is not configured. Contact the application administrator.',503);
 return tenant;
}
export function googleConfigured(): boolean {
 return process.env.DEPLOYMENT_MODE==='institutional'&&process.env.INSTITUTIONAL_ENABLED==='true'
  &&!!process.env.INSTITUTIONAL_TENANT_ID&&!!process.env.AUTH_GOOGLE_ID&&!!process.env.AUTH_GOOGLE_SECRET&&!!process.env.APP_ORIGIN;
}
