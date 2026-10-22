import {assertConfiguredTenant} from './tenant-configuration';
import { createHash, randomBytes } from 'node:crypto';
import { auditStatement, database, insert, one, statement } from '../db/demo';
import { inputs, type Identity } from '../validation/contracts';
import { DomainError, requireRole } from '../domain/policies';
import { hashPassword } from './password';
import { googleConfigured } from './runtime';
import { queuedMail,mailConfigured } from './mail';
import { limit } from './auth';

export const tokenDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
const issuer='https://accounts.google.com';
const localEligible=(row:Record<string,unknown>)=>!Number(row.isDemo)&&(process.env.DEPLOYMENT_MODE==='demo'||row.role==='SUPERVISOR'||(row.role==='STUDENT'&&Number(row.emailDomainException)===1));
function appOrigin():string {const value=process.env.APP_ORIGIN;if(!value)throw new DomainError('Account links are not configured. Contact the application administrator.',503);const url=new URL(value);if(url.protocol!=='https:'&&!(process.env.DEPLOYMENT_MODE==='demo'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new DomainError('Account links require a secure application origin.',503);return url.origin;}
async function tokenStatements(user:Identity,row:Record<string,string|number|null>,purpose:string){
 const token=randomBytes(32).toString('base64url'),time=new Date(),id=crypto.randomUUID();
 const expires=new Date(time.getTime()+(purpose==='RECOVER'?30*60000:24*3600000)).toISOString();
 const link=`${appOrigin()}/account-access#token=${token}&purpose=${purpose}`;
 return {token,statements:[
  statement('UPDATE account_tokens SET used_at=? WHERE tenant_id=? AND user_id=? AND purpose=? AND used_at IS NULL',time.toISOString(),user.tenantId,String(row.id),purpose),
  insert('account_tokens',{tenant_id:user.tenantId,user_id:String(row.id),token_hash:tokenDigest(token),purpose,email:String(row.email).toLowerCase(),session_version:Number(row.sessionVersion),expires_at:expires},id),
  queuedMail(user.tenantId,{to:String(row.email),subject:purpose==='RECOVER'?'Reset your PractiSync password':'Your PractiSync account invitation',text:`${purpose==='RECOVER'?'Reset your local account password':'Accept your invitation'}: ${link}\nThis link expires ${expires}. If you did not request it, contact the OJT office. Google account recovery is managed by Google.`},id),
 ]};
}
export async function hteActivationStatements(tenantId:string,userId:string,email:string){return (await tokenStatements({tenantId} as Identity,{id:userId,email,sessionVersion:1},'ACTIVATE')).statements;}

/** Command-line bootstrap only; deliberately not exposed by an HTTP action. */
export async function bootstrapInstitutionAdmin(name:string,email:string){
 if(process.env.DEPLOYMENT_MODE!=='institutional'||!googleConfigured()||!mailConfigured())throw new DomainError('Configure the institutional tenant, Google provider and account sender before bootstrap.',503);
 const tenantId=await assertConfiguredTenant();email=email.trim().toLowerCase();name=name.trim();
 if(!name||name.length>120||!/^[-a-z0-9._+]+@rtu\.edu\.ph$/.test(email))throw new DomainError('Provide a name and an exact RTU staff email.');
 if(await one("SELECT id FROM users WHERE tenant_id=? AND role='SUPER_ADMIN'",tenantId))throw new DomainError('This university already has a Super Admin. Use its account/invitation process.');
 if(await one('SELECT id FROM users WHERE lower(email)=?',email))throw new DomainError('This address already belongs to an account. Resolve the identity conflict through the OJT office.');
 const id=crypto.randomUUID(),row={id,email,sessionVersion:1};
 const issued=await tokenStatements({tenantId} as Identity,row,'GOOGLE_INVITE');
 await database().batch([insert('users',{tenant_id:tenantId,name,email,username:'staff.'+id.slice(0,24),role:'SUPER_ADMIN',status:'INVITED',password_hash:null,session_version:1,is_demo:0},id),...issued.statements,auditStatement(id,'INSTITUTION_ADMIN_BOOTSTRAP',id,'Authorized command-line bootstrap; Google identity must accept the invitation.',tenantId)]);
 return {id,message:'Initial Super Admin invitation queued. No identity is linked until the invitation is accepted.'};
}

export async function requestRecovery(email:string,ip:string){
 const tenantId=await assertConfiguredTenant();await limit(`recovery-ip:${tenantId}:${tokenDigest(ip)}`,10);await limit(`recovery-account:${tenantId}:${tokenDigest(email.toLowerCase())}`,3);
 if(!mailConfigured())throw new DomainError('Account email is not configured. Contact the OJT office for access assistance.',503);
 const row=await one('SELECT * FROM users WHERE tenant_id=? AND lower(email)=? AND status=\'ACTIVE\'',tenantId,email.toLowerCase());
 if(row&&localEligible(row)&&!await one('SELECT id FROM auth_identities WHERE tenant_id=? AND user_id=?',tenantId,row.id)){
  const issued=await tokenStatements({tenantId} as Identity,row,'RECOVER');
  await database().batch([...issued.statements,auditStatement(row.id,'ACCOUNT_RECOVERY_REQUESTED',row.id,null,tenantId)]);
 }
 return {message:'If this address belongs to an eligible local account, we will send a recovery link. RTU Google accounts recover access through Google.'};
}

export async function consumePasswordToken(token:string,password:string,ip:string,now=new Date()){
 if(password.length<12||password.length>128)throw new DomainError('Choose a password of 12–128 characters.');
 const tenantId=await assertConfiguredTenant();await limit(`recovery-consume:${tenantId}:${tokenDigest(ip)}`,10);
 const row=await one('SELECT t.*,u.status,u.is_demo,u.role,u.email_domain_exception,u.session_version AS current_version FROM account_tokens t JOIN users u ON u.id=t.user_id AND u.tenant_id=t.tenant_id WHERE t.tenant_id=? AND t.token_hash=?',tenantId,tokenDigest(token));
 if(!row||!['RECOVER','ACTIVATE'].includes(String(row.purpose))||row.usedAt||String(row.expiresAt)<=now.toISOString()||Number(row.sessionVersion)!==Number(row.currentVersion)||!['ACTIVE','INVITED'].includes(String(row.status))||!localEligible(row)||await one('SELECT id FROM auth_identities WHERE tenant_id=? AND user_id=?',tenantId,String(row.userId)))throw new DomainError('This link is invalid, expired or already used. Request a new link.',400);
 const claim=crypto.randomUUID(),time=now.toISOString(),hashed=await hashPassword(password);
 await database().batch([
  statement('UPDATE account_tokens SET used_at=?,claimed_by=? WHERE tenant_id=? AND id=? AND used_at IS NULL AND expires_at>?',time,claim,tenantId,row.id,time),
  statement("UPDATE users SET password_hash=?,status='ACTIVE',session_version=CASE WHEN session_version=? AND EXISTS(SELECT 1 FROM account_tokens WHERE tenant_id=? AND id=? AND claimed_by=?) THEN session_version+1 ELSE NULL END WHERE tenant_id=? AND id=?",hashed,Number(row.sessionVersion),tenantId,row.id,claim,tenantId,String(row.userId)),
  auditStatement(String(row.userId),'ACCOUNT_PASSWORD_RESET',String(row.userId),null,tenantId),
 ]).catch(()=>{throw new DomainError('This link was used or the account changed. Request a new link.',409);});
 return {message:'Password saved. Previous sessions have been revoked. Sign in with your new password.'};
}

export async function accountLifecycleAction(user:Identity,action:string,payload:unknown){
 if(action==='revokeOwnSessions'){
  inputs.revokeOwnSessions.parse(payload);const accountId=user.authenticationId??user.id;
  await limit(`session-revoke:${user.tenantId}:${accountId}`,5);
  const account=await one("SELECT session_version FROM users WHERE tenant_id=? AND id=? AND status='ACTIVE'",user.tenantId,accountId);
  if(!account)throw new DomainError('This sign-in is no longer active.',401);
  await database().batch([statement('UPDATE users SET session_version=CASE WHEN session_version=? THEN session_version+1 ELSE NULL END WHERE tenant_id=? AND id=?',Number(account.sessionVersion),user.tenantId,accountId),auditStatement(accountId,'OWN_SESSIONS_REVOKED',accountId,null,user.tenantId)]);
  return {id:accountId,message:'All your sessions have been signed out, including this browser. Sign in again to continue.'};
 }
 if(action==='retryAccountEmail'){
  requireRole(user,'SUPER_ADMIN');const d=inputs.retryAccountEmail.parse(payload);
  const job=await one("SELECT e.id FROM email_outbox e JOIN account_tokens t ON t.id=e.id AND t.tenant_id=e.tenant_id JOIN users u ON u.id=t.user_id AND u.tenant_id=t.tenant_id WHERE e.tenant_id=? AND e.id=? AND e.status='FAILED' AND t.used_at IS NULL AND t.expires_at>? AND u.status IN ('ACTIVE','INVITED') AND u.session_version=t.session_version",user.tenantId,d.jobId,new Date().toISOString());
  if(!job)throw new DomainError('The email is no longer retryable. Send a fresh invitation if needed.');
  if(!mailConfigured())throw new DomainError('Configure account email before retrying delivery.',503);
  await database().batch([statement("UPDATE email_outbox SET status='PENDING',attempts=0,available_at=?,last_error=NULL WHERE tenant_id=? AND id=? AND status='FAILED'",new Date().toISOString(),user.tenantId,job.id),auditStatement(user.id,'ACCOUNT_EMAIL_RETRY_REQUESTED',job.id,null,user.tenantId)]);
  return {id:job.id,message:'Account email retry queued.'};
 }
 if(action!=='inviteAccount')return null;requireRole(user,'SUPER_ADMIN');const d=inputs.inviteAccount.parse(payload);
 const row=await one('SELECT * FROM users WHERE tenant_id=? AND id=?',user.tenantId,d.userId);
 if(!row||Number(row.isDemo)||row.status==='DISABLED')throw new DomainError('Choose an enabled provisioned account. Fixed demo identities cannot be invited.');
 const purpose=localEligible(row)?'ACTIVATE':'GOOGLE_INVITE';
 if(purpose==='GOOGLE_INVITE'&&!String(row.email).toLowerCase().endsWith('@rtu.edu.ph'))throw new DomainError('Institutional staff invitations require an RTU address.');
 const issued=await tokenStatements(user,row,purpose);
 await database().batch([...issued.statements,auditStatement(user.id,'ACCOUNT_INVITED',row.id,null,user.tenantId)]);
 return {id:row.id,message:'Invitation queued. Account roles and university scope come from the preassigned account.'};
}

export interface TrustedGoogleProfile {iss?:string|null;sub?:string|null;email?:string|null;email_verified?:boolean|null;hd?:string|null;name?:string|null;}
/** Called only after Auth.js validates the OIDC response, signature, audience, nonce and expiry. */
export async function authorizeGoogle(profile:TrustedGoogleProfile,invitation?:string){
 const tenantId=await assertConfiguredTenant(),email=profile.email?.trim().toLowerCase();
 if(!profile.sub||!email||profile.email_verified!==true||profile.hd!=='rtu.edu.ph'||!email.endsWith('@rtu.edu.ph')||!['https://accounts.google.com','accounts.google.com'].includes(profile.iss??''))throw new DomainError('Use a verified RTU Google Workspace account.',403);
 const linked=await one('SELECT u.* FROM auth_identities a JOIN users u ON u.id=a.user_id AND u.tenant_id=a.tenant_id WHERE a.provider=\'google\' AND a.issuer=? AND a.subject=?',issuer,profile.sub);
 if(linked){if(linked.tenantId!==tenantId||linked.status!=='ACTIVE')throw new DomainError('This account is unavailable. Contact the OJT office.',403);return linked;}
 const now=new Date().toISOString(),id=crypto.randomUUID();
 if(invitation){
  const invite=await one("SELECT t.*,u.status,u.session_version AS current_version FROM account_tokens t JOIN users u ON u.id=t.user_id AND u.tenant_id=t.tenant_id WHERE t.tenant_id=? AND t.token_hash=? AND t.purpose='GOOGLE_INVITE'",tenantId,tokenDigest(invitation));
  if(!invite||invite.usedAt||String(invite.expiresAt)<=now||invite.email!==email||invite.status==='DISABLED'||Number(invite.currentVersion)!==Number(invite.sessionVersion))throw new DomainError('The invitation is invalid, expired or belongs to another account.',403);
  const claim=crypto.randomUUID();
  await database().batch([
   statement('UPDATE account_tokens SET used_at=?,claimed_by=? WHERE tenant_id=? AND id=? AND used_at IS NULL AND expires_at>?',now,claim,tenantId,invite.id,now),
   statement("INSERT INTO auth_identities (id,tenant_id,created_at,user_id,provider,issuer,subject) SELECT ?,tenant_id,?,user_id,'google',?,? FROM account_tokens WHERE tenant_id=? AND id=? AND claimed_by=?",id,now,issuer,profile.sub,tenantId,invite.id,claim),
   statement("UPDATE users SET status='ACTIVE',password_hash=NULL,session_version=CASE WHEN session_version=? AND EXISTS(SELECT 1 FROM auth_identities WHERE id=? AND tenant_id=?) THEN session_version+1 ELSE NULL END WHERE tenant_id=? AND id=?",Number(invite.sessionVersion),id,tenantId,tenantId,String(invite.userId)),
   auditStatement(String(invite.userId),'GOOGLE_IDENTITY_LINKED',String(invite.userId),null,tenantId),
  ]).catch(()=>{throw new DomainError('The invitation was used or the account changed. Contact the OJT office.',409);});
  return (await one('SELECT * FROM users WHERE tenant_id=? AND id=?',tenantId,String(invite.userId)))!;
 }
 // Existing identities require an explicit invitation; matching an email never transfers records.
 if(await one('SELECT id FROM users WHERE lower(email)=?',email))throw new DomainError('This account requires an OJT office invitation before Google can be linked.',403);
 await database().batch([
  insert('users',{tenant_id:tenantId,name:profile.name?.slice(0,120)||email,username:'g.'+id,email,role:'STUDENT',status:'ACTIVE',is_demo:0,password_hash:null,session_version:1,email_domain_exception:0},id),
  insert('auth_identities',{tenant_id:tenantId,user_id:id,provider:'google',issuer,subject:profile.sub}),
  insert('student_verifications',{tenant_id:tenantId,requester_id:id,status:'DRAFT',updated_at:now}),
  auditStatement(id,'GOOGLE_STUDENT_PROVISIONED',id,null,tenantId),
 ]);
 return (await one('SELECT * FROM users WHERE tenant_id=? AND id=?',tenantId,id))!;
}
