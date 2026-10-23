import { z } from 'zod';
import { database } from '../db/demo';
import { RequestBodyError } from '../validation/request-body';
import type { ConsentLanguage, ConsentStatus } from '../validation/consent';
import { getConsentStatus, type ConsentState, type ConsentSubject } from './consent';

export interface ConsentHistoryEntry {
 id:string;status:ConsentStatus;language:ConsentLanguage;createdAt:string;
 policy:{id:string;version:string;effectiveAt:string};
}
export interface ConsentHistoryPage {
 state:ConsentState;acceptedAt:string|null;history:ConsentHistoryEntry[];nextCursor:string|null;
}
interface HistoryRow extends Record<string,unknown> {
 id:string;status:ConsentStatus;language:ConsentLanguage;created_at:string|Date;
 policy_id:string;version:string;effective_at:string|Date;
}
const cursorInput=z.object({createdAt:z.string().datetime({offset:true}),id:z.string().min(1).max(120)}).strict();
const iso=(value:string|Date)=>new Date(value).toISOString();
const pageSize=50;

function readCursor(value:string|null) {
 if(value===null)return null;
 try{
  if(value.length>1024||!value.length||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid cursor');
  return cursorInput.parse(JSON.parse(Buffer.from(value,'base64url').toString('utf8')));
 }catch{throw new RequestBodyError('The privacy history cursor is invalid. Reload your history and try again.',400);}
}

export async function getConsentHistory(user:ConsentSubject,cursor:string|null=null):Promise<ConsentHistoryPage> {
 const after=readCursor(cursor),userId=user.authenticationId??user.id,state=await getConsentStatus(user);
 const [rows,acceptance]=await Promise.all([
  database().prepare(`SELECT c.id,c.status,c.language,c.created_at,p.id AS policy_id,p.version,p.effective_at
   FROM user_consents c JOIN privacy_policies p ON p.id=c.policy_id
   WHERE c.tenant_id=? AND c.user_id=? ${after?'AND (c.created_at<? OR (c.created_at=? AND c.id<?))':''}
   ORDER BY c.created_at DESC,c.id DESC LIMIT 51`)
   .bind(user.tenantId,userId,...(after?[after.createdAt,after.createdAt,after.id]:[])).all<HistoryRow>(),
  database().prepare("SELECT created_at FROM user_consents WHERE tenant_id=? AND user_id=? AND policy_id=? AND status='ACCEPTED' ORDER BY created_at DESC,id DESC LIMIT 1")
   .bind(user.tenantId,userId,state.policy.id).first<{created_at:string|Date}>(),
 ]);
 const history=rows.results.slice(0,pageSize).map(row=>({id:row.id,status:row.status,language:row.language,createdAt:iso(row.created_at),policy:{id:row.policy_id,version:row.version,effectiveAt:iso(row.effective_at)}}));
 const last=history.at(-1);
 return {state,acceptedAt:acceptance?iso(acceptance.created_at):null,history,
  nextCursor:rows.results.length>pageSize&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last.id})).toString('base64url'):null};
}
