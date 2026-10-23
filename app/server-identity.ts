import 'server-only';
import {headers} from 'next/headers';
import {identity} from '@/packages/auth/auth';
import { requirePageConsent } from '@/packages/privacy/page-guard';
import { safeInternalPath } from '@/packages/auth/routes';

export async function pageIdentity(allowUnverified=false,allowUnconsented=false){
 const requestHeaders=await headers();
 const host=requestHeaders.get('host')??'localhost';
 const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
 const secureSession=/(?:^|;\s*)__Secure-authjs\.session-token=/.test(requestHeaders.get('cookie')??'');
 const protocol=secureSession||!localHost?'https':'http';
 const request=new Request(protocol+'://'+host+'/',{headers:requestHeaders});
 if(!allowUnconsented)await requirePageConsent(await identity(request,{allowUnverified:true}),safeInternalPath(requestHeaders.get('x-practisync-return-to'))??'/');
 return identity(request,{allowUnverified});
}
