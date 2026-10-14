import 'server-only';
import {headers} from 'next/headers';
import {identity} from '@/packages/auth/auth';

export async function pageIdentity(){
 const requestHeaders=await headers();
 const host=requestHeaders.get('host')??'localhost';
 const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
 const secureSession=/(?:^|;\s*)__Secure-authjs\.session-token=/.test(requestHeaders.get('cookie')??'');
 const protocol=secureSession||!localHost?'https':'http';
 return identity(new Request(protocol+'://'+host+'/',{headers:requestHeaders}));
}
