import {Auth,type AuthConfig} from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import {one,seed,settings,statement,database} from '../db/demo';
import {verifyPassword} from './password';
import {quickDemoAccounts} from '../test-utils/fixtures';
import {DomainError,demoAllowed} from '../domain/policies';
import type {Identity,Role} from '../validation/contracts';
export async function limit(key:string,max=15){
 const now=Date.now(),window=600000;
 await statement('INSERT INTO rate_limits (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start<? THEN 1 ELSE rate_limits.attempts+1 END, window_start=CASE WHEN rate_limits.window_start<? THEN ? ELSE rate_limits.window_start END',key,now,now-window,now-window,now).run();
 const row=await database().prepare('SELECT attempts FROM rate_limits WHERE key=?').bind(key).first<{attempts:number}>();if((row?.attempts??max+1)>max)throw new DomainError('Too many attempts. Please try again in 10 minutes.',429);
}
export function config():AuthConfig {
 const cfg=settings();if(!cfg.AUTH_SECRET)throw new DomainError('Sign-in is not configured. The app administrator must set the authentication secret.',503);
 return {secret:cfg.AUTH_SECRET,trustHost:true,basePath:'/api/auth',session:{strategy:'jwt',maxAge:60*60*8},pages:{signIn:'/',error:'/'},providers:[Credentials({id:'credentials',name:'University account',credentials:{username:{},password:{},demoId:{}},async authorize(credentials,request){
  await seed();const clientIp=request.headers.get('x-real-ip')??request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'private-demo';await limit('login:'+clientIp);
  const demoId=typeof credentials.demoId==='string'?credentials.demoId:null;
  let user;
  if(demoId){if(!demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)||!quickDemoAccounts.some(a=>a.id===demoId))return null;user=await one('SELECT * FROM users WHERE id=? AND is_demo=1 AND status=\'ACTIVE\'',demoId);}
  else{const username=typeof credentials.username==='string'?credentials.username.toLowerCase().trim():'';const password=typeof credentials.password==='string'?credentials.password:'';if(username.length>80||password.length>128)return null;user=await one('SELECT * FROM users WHERE username=? AND status=\'ACTIVE\'',username);if(!user||!await verifyPassword(password,user.passwordHash as string|null))return null;}
  if(!user)return null;return {id:user.id,name:String(user.name),email:String(user.email),sessionVersion:Number(user.sessionVersion)};
 }})],callbacks:{async jwt({token,user}){if(user){token.sub=user.id;token.sessionVersion=(user as unknown as {sessionVersion:number}).sessionVersion;}return token;},async session({session,token}){const row=token.sub?await one('SELECT id,status,session_version FROM users WHERE id=?',token.sub):null;if(!row||row.status!=='ACTIVE'||Number(row.sessionVersion)!==token.sessionVersion){return {...session,user:undefined} as unknown as typeof session;}return {...session,user:{...session.user,id:token.sub,sessionVersion:token.sessionVersion}};}},logger:{error(error){console.error('Authentication failed:',error);}}};
}
export async function authHandler(request:Request){return Auth(request,config());}
export async function identity(request:Request):Promise<Identity>{
 const url=new URL('/api/auth/session',request.url);const response=await Auth(new Request(url,{headers:request.headers}),config());const session=await response.json() as {user?:{id?:string;sessionVersion?:number}};
 if(!session?.user?.id)throw new DomainError('Please sign in to continue.',401);
 const row=await one('SELECT * FROM users WHERE id=? AND status=\'ACTIVE\'',session.user.id);if(!row||Number(row.sessionVersion)!==session.user.sessionVersion)throw new DomainError('Your session has expired. Please sign in again.',401);
 return {id:row.id,name:String(row.name),username:String(row.username),email:String(row.email),role:row.role as Role,status:String(row.status),sessionVersion:Number(row.sessionVersion),isDemo:Number(row.isDemo),courseId:row.courseId as string|null,companyId:row.companyId as string|null,tenantId:row.tenantId};
}
