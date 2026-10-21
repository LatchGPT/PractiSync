import { AsyncLocalStorage } from 'node:async_hooks';
import { DomainError } from '../domain/policies';
import { runtimeTenantId } from '../auth/runtime';

const context=new AsyncLocalStorage<string>();
export function withTenant<T>(tenantId:string,work:()=>T):T {
 if(!tenantId)throw new DomainError('A university scope is required.',403);
 return context.run(tenantId,work);
}
export function writeTenant():string {return context.getStore()??runtimeTenantId();}
