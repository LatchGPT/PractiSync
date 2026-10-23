import { database, settings, statement } from '../db/demo';
import { demoAllowed, DomainError } from '../domain/policies';
import type { Identity } from '../validation/contracts';
import { consentInput, type ConsentLanguage, type ConsentStatus } from '../validation/consent';

interface PolicyRow extends Record<string,unknown> {
 id:string;version:string;title_en:string;body_en:string;title_fil:string;body_fil:string;
 effective_at:string|Date;created_at:string|Date;
}
interface StateRow extends PolicyRow {
 consent_status:ConsentStatus|null;consent_language:ConsentLanguage|null;consent_created_at:string|Date|null;
}
export interface PrivacyPolicy {
 id:string;version:string;titleEn:string;bodyEn:string;titleFil:string;bodyFil:string;effectiveAt:string;createdAt:string;
}
export interface ConsentState {
 status:ConsentStatus|null;language:ConsentLanguage|null;recordedAt:string|null;required:boolean;
 policy:{id:string;version:string;effectiveAt:string};
}
export interface ConsentMetadata {ipAddress:string|null;userAgent:string|null;}
export class ConsentRequired extends DomainError {
 readonly code='CONSENT_REQUIRED';
 constructor(readonly policyVersion:string){super('Agree to the current Privacy Notice before using PractiSync.',403);}
}
export class PrivacyPolicyUnavailable extends DomainError {
 readonly code='PRIVACY_POLICY_UNAVAILABLE';
 constructor(){super('The current Privacy Notice is unavailable. Try again shortly or contact the OJT office.',503);}
}
export class ConsentPolicyChanged extends DomainError {
 readonly code='CONSENT_POLICY_CHANGED';
 constructor(){super('The Privacy Notice or your account changed. Refresh the notice and review it before choosing again.',409);}
}

export type ConsentSubject=Pick<Identity,'id'|'tenantId'|'authenticationId'>;
const accountId=(user:ConsentSubject)=>user.authenticationId??user.id;
const iso=(value:string|Date)=>new Date(value).toISOString();
const policyFrom=(row:PolicyRow):PrivacyPolicy=>({
 id:row.id,version:row.version,titleEn:row.title_en,bodyEn:row.body_en,titleFil:row.title_fil,bodyFil:row.body_fil,
 effectiveAt:iso(row.effective_at),createdAt:iso(row.created_at),
});
const policySummary=(policy:PrivacyPolicy)=>({id:policy.id,version:policy.version,effectiveAt:policy.effectiveAt});

/** No process/JWT cache: a newly published version is visible on the next request. */
export async function currentPrivacyPolicy():Promise<PrivacyPolicy> {
 const {results}=await database().prepare('SELECT * FROM privacy_policies WHERE is_current=TRUE LIMIT 2').all<PolicyRow>();
 if(results.length!==1)throw new PrivacyPolicyUnavailable();
 return policyFrom(results[0]!);
}

/** One database statement observes both the current policy and its latest scoped choice. */
export async function getConsentStatus(user:ConsentSubject):Promise<ConsentState> {
 const {results}=await database().prepare(`SELECT p.*,c.status AS consent_status,c.language AS consent_language,c.created_at AS consent_created_at
 FROM privacy_policies p LEFT JOIN user_consents c ON c.id=(
  SELECT latest.id FROM user_consents latest WHERE latest.tenant_id=? AND latest.user_id=? AND latest.policy_id=p.id
  ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1
 ) WHERE p.is_current=TRUE LIMIT 2`).bind(user.tenantId,accountId(user)).all<StateRow>();
 if(results.length!==1)throw new PrivacyPolicyUnavailable();
 const row=results[0]!;
 return {status:row.consent_status,language:row.consent_language,recordedAt:row.consent_created_at?iso(row.consent_created_at):null,
  required:row.consent_status!=='ACCEPTED',policy:policySummary(policyFrom(row))};
}

/** Call only with a server-authenticated identity. Throws a machine-readable 403 for adapters to handle. */
export async function requireConsent(user:ConsentSubject):Promise<ConsentState> {
 const state=await getConsentStatus(user);
 if(state.required)throw new ConsentRequired(state.policy.version);
 return state;
}

export async function currentPrivacyVersion():Promise<string> {
 const {results}=await database().prepare('SELECT version FROM privacy_policies WHERE is_current=TRUE LIMIT 2').all<{version:string}>();
 if(results.length!==1)throw new PrivacyPolicyUnavailable();
 return results[0]!.version;
}

/** Reused inside worker recipient queries so consent is checked again at delivery time. */
export const acceptedConsentPredicate=(userAlias:string)=>`EXISTS (SELECT 1 FROM privacy_policies privacy WHERE privacy.is_current=TRUE AND
 (SELECT choice.status FROM user_consents choice WHERE choice.policy_id=privacy.id AND choice.tenant_id=${userAlias}.tenant_id AND choice.user_id=${userAlias}.id ORDER BY choice.created_at DESC,choice.id DESC LIMIT 1)='ACCEPTED')`;

const actions={ACCEPT:'ACCEPTED',DECLINE:'DECLINED',WITHDRAW:'WITHDRAWN'} as const;
function inserted(result:unknown) {
 if(typeof result==='number')return result===1;
 if(!result||typeof result!=='object'||!('meta' in result))return false;
 const meta=result.meta;
 return !!meta&&typeof meta==='object'&&'changes' in meta&&(meta.changes===1||meta.changes===BigInt(1));
}

/** Always appends. Policy publication and concurrent choices cannot reorder or transfer this choice. */
export async function recordConsent(user:Identity,payload:unknown,metadata:ConsentMetadata,ifMatch:string|null=null) {
 const input=consentInput.parse(payload),policy=await currentPrivacyPolicy();
 if(ifMatch!==null&&ifMatch!==`"${policy.version}"`)throw new ConsentPolicyChanged();
 const cfg=settings(),sqlite=cfg.PRACTISYNC_LOCAL_DEMO==='true'&&demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED);
 const userId=accountId(user),id=crypto.randomUUID(),now=new Date().toISOString();
 // Serialize choices for one account; keep publication from changing the notice during the append.
 const locks=sqlite?[]:[statement('LOCK TABLE privacy_policies IN SHARE MODE'),
  statement('SELECT id FROM users WHERE id=? AND tenant_id=? FOR UPDATE',userId,user.tenantId)];
 // A later request must sort later even in the same millisecond or after a clock adjustment.
 const timestamp=sqlite
  ? "CASE WHEN (SELECT MAX(created_at) FROM user_consents WHERE tenant_id=? AND user_id=? AND policy_id=?)>=? THEN (SELECT strftime('%Y-%m-%dT%H:%M:%fZ',MAX(created_at),'+0.001 seconds') FROM user_consents WHERE tenant_id=? AND user_id=? AND policy_id=?) ELSE ? END"
  : "GREATEST(CAST(? AS timestamp),COALESCE((SELECT MAX(created_at)+INTERVAL '1 millisecond' FROM user_consents WHERE tenant_id=? AND user_id=? AND policy_id=?),CAST(? AS timestamp)))";
 const timeArgs=sqlite?[user.tenantId,userId,policy.id,now,user.tenantId,userId,policy.id,now]:[now,user.tenantId,userId,policy.id,now];
 const statusParameter=sqlite?'?':'CAST(? AS "ConsentStatus")';
 const results=await database().batch([...locks,statement(`INSERT INTO user_consents
 (id,user_id,tenant_id,policy_id,status,language,ip_address,user_agent,created_at)
 SELECT ?,?,?,p.id,${statusParameter},?,?,?,${timestamp} FROM privacy_policies p
 WHERE p.id=? AND p.is_current=TRUE AND EXISTS(SELECT 1 FROM users u WHERE u.id=? AND u.tenant_id=? AND u.status='ACTIVE')`,
 id,userId,user.tenantId,actions[input.action],input.language,metadata.ipAddress,metadata.userAgent,...timeArgs,policy.id,userId,user.tenantId)]);
 if(!inserted(results.at(-1)))throw new ConsentPolicyChanged();
 const row=await database().prepare('SELECT created_at FROM user_consents WHERE id=? AND tenant_id=? AND user_id=?')
  .bind(id,user.tenantId,userId).first<{created_at:string|Date}>();
 if(!row)throw new DomainError('Your privacy choice could not be confirmed. Refresh and check its status.',503);
 return {id,status:actions[input.action],language:input.language,createdAt:iso(row.created_at),policy:policySummary(policy)};
}
