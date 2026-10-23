import { runtimeTenantId } from './runtime';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { insert, list, one, statement } from '../db/demo';
import { DomainError } from '../domain/policies';

export interface AccountMail {to:string;subject:string;text:string;}
const key=()=>{if(!process.env.AUTH_SECRET)throw new DomainError('Account email encryption is not configured.',503);return createHash('sha256').update(process.env.AUTH_SECRET).digest();};
export function encryptMail(mail:AccountMail):string {const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(mail),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');}
export function decryptMail(value:string):AccountMail {const bytes=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));}
export function mailConfigured():boolean {return process.env.MAIL_TRANSPORT==='test'?process.env.DEPLOYMENT_MODE==='demo':!!process.env.RESEND_API_KEY&&!!process.env.MAIL_FROM&&process.env.DEPLOYMENT_MODE==='institutional';}
export function queuedMail(tenantId:string,mail:AccountMail,id=crypto.randomUUID()) {if(!mailConfigured())throw new DomainError('Account email is not configured. Contact the Internship Office for access assistance.',503);return insert('email_outbox',{tenant_id:tenantId,encrypted_payload:encryptMail(mail),available_at:new Date().toISOString()},id);}
/** Test transport stays in the server process and is never exposed through an API. */
export const capturedTestMail:AccountMail[]=[];
export async function deliverAccountMail(now=new Date(),tenantId?:string):Promise<number> {
 if(!mailConfigured())return 0;
 const time=now.toISOString();
 await statement("UPDATE email_outbox SET status='EXPIRED',encrypted_payload='' WHERE tenant_id=? AND status<>'DELIVERED' AND EXISTS (SELECT 1 FROM account_tokens t WHERE t.id=email_outbox.id AND t.tenant_id=email_outbox.tenant_id AND (t.used_at IS NOT NULL OR t.expires_at<=?))",tenantId??runtimeTenantId(),time).run();
 const rows=await list("SELECT * FROM email_outbox WHERE (status='PENDING' OR (status='SENDING' AND locked_until<?)) AND available_at<=? AND tenant_id=? ORDER BY created_at LIMIT 20",time,time,tenantId??runtimeTenantId());
 let delivered=0;
 for(const row of rows){
  const lease=new Date(now.getTime()+120000).toISOString();
  // The lease value identifies this claim and the conditional update admits one worker.
  const claim=crypto.randomUUID();
  await statement("UPDATE email_outbox SET status='SENDING',locked_until=?,last_error=? WHERE id=? AND tenant_id=? AND (status='PENDING' OR (status='SENDING' AND locked_until<?))",lease,claim,row.id,row.tenantId,time).run();
  if(!(await one('SELECT id FROM email_outbox WHERE id=? AND tenant_id=? AND last_error=?',row.id,row.tenantId,claim)))continue;
  try{
    const accountToken=await one('SELECT id FROM account_tokens WHERE tenant_id=? AND id=?',row.tenantId,row.id);
    if(accountToken){
     const active=await one("SELECT t.id FROM account_tokens t JOIN users u ON u.id=t.user_id AND u.tenant_id=t.tenant_id WHERE t.tenant_id=? AND t.id=? AND t.used_at IS NULL AND t.expires_at>? AND t.session_version=u.session_version AND u.status IN ('ACTIVE','INVITED')",row.tenantId,row.id,time);
     if(!active){await statement("UPDATE email_outbox SET status='CANCELLED',encrypted_payload='',locked_until=NULL WHERE tenant_id=? AND id=? AND last_error=?",row.tenantId,row.id,claim).run();continue;}
    }
   const mail=decryptMail(String(row.encryptedPayload));
   if(process.env.MAIL_TRANSPORT==='test')capturedTestMail.push(mail);
   else {const result=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify({from:process.env.MAIL_FROM,...mail})});if(!result.ok)throw new Error('Email provider rejected delivery.');}
   await statement("UPDATE email_outbox SET status='DELIVERED',encrypted_payload='',delivered_at=?,locked_until=NULL,last_error=NULL WHERE id=? AND tenant_id=? AND last_error=?",time,row.id,row.tenantId,claim).run();delivered++;
  }catch{
   const attempts=Number(row.attempts)+1,delay=[60000,300000,900000][Math.min(attempts-1,2)];
   await statement('UPDATE email_outbox SET status=?,attempts=?,available_at=?,locked_until=NULL,last_error=? WHERE id=? AND tenant_id=? AND last_error=?',attempts>=3?'FAILED':'PENDING',attempts,new Date(now.getTime()+delay).toISOString(),'Account email delivery failed; check sender configuration.',row.id,row.tenantId,claim).run();
  }
 }
 return delivered;
}
