import { getConsentStatus } from '../privacy/consent';
import {assertConfiguredTenant} from './tenant-configuration';
import Google from '@auth/core/providers/google';
import { authorizeGoogle } from './accounts';
import { googleConfigured,runtimeTenantId } from './runtime';
import {Auth,type AuthConfig} from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import {studentEmailAllowed} from './student-email';
import {one,seed,settings,statement,database} from '../db/demo';
import {verifyPassword} from './password';
import {DomainError,demoAllowed} from '../domain/policies';
import type {Identity,Role} from '../validation/contracts';
import {isRole} from './routes';
import {ensureNewStudentDemo,verificationFor,StudentVerificationRequired} from '../domain/student-verification';
import {demoAccounts} from '../test-utils/fixtures';
export async function limit(key:string,max=15){
 const now=Date.now(),window=600000;
 await statement('INSERT INTO rate_limits (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start<? THEN 1 ELSE rate_limits.attempts+1 END, window_start=CASE WHEN rate_limits.window_start<? THEN ? ELSE rate_limits.window_start END',key,now,now-window,now-window,now).run();
 const row=await database().prepare('SELECT attempts FROM rate_limits WHERE key=?').bind(key).first<{attempts:number}>();if((row?.attempts??max+1)>max)throw new DomainError('Too many attempts. Please try again in 10 minutes.',429);
}
export function config(request?:Request):AuthConfig {
 const cfg=settings();if(!cfg.AUTH_SECRET)throw new DomainError('Sign-in is not configured. The app administrator must set the authentication secret.',503);
 return {secret:cfg.AUTH_SECRET,trustHost:true,basePath:'/api/auth',session:{strategy:'jwt',maxAge:60*60*8},pages:{signIn:'/login',error:'/login'},providers:[...(googleConfigured()?[Google({clientId:process.env.AUTH_GOOGLE_ID!,clientSecret:process.env.AUTH_GOOGLE_SECRET!,authorization:{params:{hd:'rtu.edu.ph',prompt:'select_account'}}})]:[]),Credentials({id:'credentials',name:'University account',credentials:{username:{},password:{},demoId:{}},async authorize(credentials,request){
  await seed();const clientIp=request.headers.get('x-real-ip')??request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'private-demo';await limit('login:'+clientIp);
  const demoId=typeof credentials.demoId==='string'?credentials.demoId:null;
  let user;
  if(demoId){
   if(!demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)||!(demoAccounts.some(a=>a.id===demoId)||demoId==='demo-new-student'))return null;
   if(demoId==='demo-new-student')await ensureNewStudentDemo();
   user=await one("SELECT * FROM users WHERE tenant_id=? AND id=? AND is_demo=1 AND status='ACTIVE'",runtimeTenantId(),demoId);
  }else{
   const username=typeof credentials.username==='string'?credentials.username.toLowerCase().trim():'';const password=typeof credentials.password==='string'?credentials.password:'';if(username.length>254||password.length>128)return null;
   user=await one("SELECT * FROM users WHERE tenant_id=? AND (username=? OR lower(email)=?) AND status='ACTIVE'",runtimeTenantId(),username,username);if(!user||!await verifyPassword(password,user.passwordHash as string|null))return null;
  }
  if(!user||!studentEmailAllowed(user))return null;if(process.env.DEPLOYMENT_MODE==='institutional'&&user.role!=='SUPERVISOR'&&!(user.role==='STUDENT'&&Number(user.emailDomainException)===1))return null;return {id:user.id,name:String(user.name),email:String(user.email),sessionVersion:Number(user.sessionVersion)};
 }})],callbacks:{async signIn({user,account,profile}){if(account?.provider==='google'){try{const invitation=request?.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('ps_invite='))?.slice(10);const row=await authorizeGoogle(profile??{},invitation);user.id=row.id;user.name=String(row.name);user.email=String(row.email);(user as unknown as {sessionVersion:number}).sessionVersion=Number(row.sessionVersion);return true;}catch{return '/login?error=InstitutionalAccess';}}return true;},async jwt({token,user,trigger}){if(user){token.sub=user.id;token.sessionVersion=(user as unknown as {sessionVersion:number}).sessionVersion;}if(token.sub&&(user||trigger==='update')){const state=await getConsentStatus({id:token.sub,tenantId:runtimeTenantId()});token.consentVersion=state.required?null:state.policy.version;}return token;},async session({session,token}){const row=token.sub?await one('SELECT id,status,session_version FROM users WHERE id=? AND tenant_id=?',token.sub,runtimeTenantId()):null;if(!row||row.status!=='ACTIVE'||Number(row.sessionVersion)!==token.sessionVersion){return {...session,user:undefined} as unknown as typeof session;}return {...session,user:{...session.user,id:token.sub,sessionVersion:token.sessionVersion},consentVersion:token.consentVersion??null};}},logger:{error(error){console.error('Authentication failed:',error);}}};
}
export async function authHandler(request:Request){await assertConfiguredTenant();return Auth(request,config(request));}
export async function identity(request:Request,options:{allowUnverified?:boolean}={}):Promise<Identity>{
 await assertConfiguredTenant();
 const url=new URL('/api/auth/session',request.url);const response=await Auth(new Request(url,{headers:request.headers}),config(request));const session=await response.json() as {user?:{id?:string;sessionVersion?:number}};
 if(!session?.user?.id)throw new DomainError('Please sign in to continue.',401);
 const row=await one('SELECT * FROM users WHERE id=? AND tenant_id=? AND status=\'ACTIVE\'',session.user.id,runtimeTenantId());if(!row||Number(row.sessionVersion)!==session.user.sessionVersion)throw new DomainError('Your session has expired. Please sign in again.',401);if(!isRole(row.role))throw new DomainError('This account does not have an assigned PractiSync role.',403);
 const asIdentity=(record:typeof row):Identity=>({id:record.id,name:String(record.name),username:String(record.username),email:String(record.email),role:record.role as Role,status:String(record.status),sessionVersion:Number(record.sessionVersion),isDemo:Number(record.isDemo),courseId:record.courseId as string|null,companyId:record.companyId as string|null,tenantId:record.tenantId});
 if(!studentEmailAllowed(row))throw new DomainError('Student access requires an @rtu.edu.ph email or an authorized manual account.',403);
 const signedIn=asIdentity(row);
 const verification=await verificationFor(signedIn);
 if(options.allowUnverified)return signedIn;
 if(verification){
  if(verification.status!=='APPROVED'||!verification.approvedStudentId)throw new StudentVerificationRequired();
  const student=await one("SELECT * FROM users WHERE tenant_id=? AND id=? AND role='STUDENT' AND status='ACTIVE'",signedIn.tenantId,String(verification.approvedStudentId));
  if(!student)throw new DomainError('The linked student account is unavailable. Contact the OJT office.',403);
  return {...asIdentity(student),email:signedIn.email,authenticationId:signedIn.id,isDemo:signedIn.isDemo};
 }
 return signedIn;
}
