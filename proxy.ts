import { getToken } from '@auth/core/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { currentPrivacyVersion } from './packages/privacy/consent';
import { consentPath } from './packages/privacy/paths';
import { safeInternalPath } from './packages/auth/routes';

export async function proxy(request:NextRequest) {
 const headers=new Headers(request.headers);
 headers.set('x-practisync-return-to',request.nextUrl.pathname+request.nextUrl.search);
 const next=()=>NextResponse.next({request:{headers}});
 if(!process.env.AUTH_SECRET)return next();
 try{
  const token=await getToken({req:request,secret:process.env.AUTH_SECRET,secureCookie:request.nextUrl.protocol==='https:'});
  const returnTo=['/login','/login/complete'].includes(request.nextUrl.pathname)?safeInternalPath(request.nextUrl.searchParams.get('redirect'))??'/':request.nextUrl.pathname+request.nextUrl.search;
  if(token&&token.consentVersion!==await currentPrivacyVersion())return NextResponse.redirect(new URL(consentPath(returnTo),request.url));
 }catch{/* Page and API database guards remain authoritative, including on proxy lookup failure. */}
 return next();
}

export const config={matcher:['/','/login','/login/complete','/dashboard/:path*','/settings/:path*','/student-verification','/evaluate/:path*']};
