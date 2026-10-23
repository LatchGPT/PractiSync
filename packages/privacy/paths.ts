import { safeInternalPath } from '../auth/routes';

export function consentPath(returnTo:unknown='/') {
 const safe=safeInternalPath(returnTo)??'/';
 return '/consent?redirect='+encodeURIComponent(safe);
}

export function consentReturnPath(value:unknown,fallback:string) {
 let safe=safeInternalPath(value);
 for(let depth=0;safe&&depth<5;depth++){
  const url=new URL(safe,'https://practisync.invalid');
  if(['/consent','/login','/login/complete'].includes(url.pathname)){safe=safeInternalPath(url.searchParams.get('redirect'));continue;}
  return url.pathname.startsWith('/api/')?fallback:safe;
 }
 return fallback;
}
