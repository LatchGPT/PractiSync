import {list,one} from '../db/demo';
import {DomainError} from './policies';
import type {Action,Identity,Role} from '../validation/contracts';
import {modules,configurableRoles,moduleLabels,type Module} from '../validation/features';

export {modules,configurableRoles,moduleLabels,type Module};

const actionModule:Partial<Record<Action,Module>>={join:'classes',class:'classes',revokeCode:'classes',dtr:'attendance',confirm:'attendance',documentReview:'documents',incident:'incidents',resolveCase:'incidents',escalateCase:'incidents',job:'jobs',application:'jobs',applicationStatus:'jobs',announcement:'announcements',evaluation:'competencies',review:'directory',moderateReview:'directory',policy:'policies',grantScope:'policies'};

export async function featureAccess(user:Identity):Promise<Record<Module,boolean>>{
 const result=Object.fromEntries(modules.map(module=>[module,true])) as Record<Module,boolean>;
 if(user.role==='SUPER_ADMIN')return result;
 const rows=await list('SELECT module,enabled FROM feature_settings WHERE tenant_id=? AND role=?',user.tenantId,user.role);
 for(const row of rows)if(modules.includes(String(row.module) as Module))result[String(row.module) as Module]=Number(row.enabled)===1;
 return result;
}
export async function requireFeature(user:Identity,module:Module){
 if(user.role==='SUPER_ADMIN')return;
 const row=await one('SELECT enabled FROM feature_settings WHERE tenant_id=? AND role=? AND module=?',user.tenantId,user.role,module);
 if(row&&Number(row.enabled)!==1)throw new DomainError(`${moduleLabels[module]} is disabled for your role.`,403);
}
export async function requireActionFeature(user:Identity,action:Action){const feature=actionModule[action];if(feature)await requireFeature(user,feature);}
export function isConfigurableRole(role:Role):role is typeof configurableRoles[number]{return configurableRoles.includes(role as typeof configurableRoles[number]);}
