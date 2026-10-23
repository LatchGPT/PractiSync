'use client';

import LandingLoginView from './landing-login';
import {loginCompletionPath,safeInternalPath} from '@/packages/auth/routes';

export async function authSubmit(provider:string,values:Record<string,string>,returnTo:string='/'){
 const csrf=await fetch('/api/auth/csrf',{cache:'no-store'}).then(r=>r.json()) as {csrfToken?:string;error?:string};
 if(!csrf.csrfToken)throw new Error(csrf.error??'Sign-in is not available.');
 const callbackPath=provider==='signout'?'/login':loginCompletionPath(safeInternalPath(returnTo)??'/');
 const response=await fetch('/api/auth/'+provider,{
  method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},
  body:new URLSearchParams({...values,csrfToken:csrf.csrfToken,callbackUrl:new URL(callbackPath,location.origin).toString()}),
 });
 const result=await response.json() as {url?:string;error?:string};
 if(!response.ok||result.error||result.url?.includes('error='))throw new Error(provider==='signout'?'Sign out failed.':'Unable to sign in. Check your username and password, or try again shortly.');
 return result;
}

export default function LoginClient({configured,google=false,initialAuthError='',redirectTo='/'}:{demo?:boolean;configured:boolean;google?:boolean;initialAuthError?:string;redirectTo?:string}){
 const safeRedirect=safeInternalPath(redirectTo)??'/';
 return <LandingLoginView initialAuthError={initialAuthError} google={google} configured={configured} redirectTo={safeRedirect} onAuthSubmit={(provider,values)=>authSubmit(provider,values,safeRedirect)}/>;
}
