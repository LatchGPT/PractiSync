import {headers} from 'next/headers';
import {identity} from '@/packages/auth/auth';
import {snapshot} from '@/packages/domain/read';
import {settings} from '@/packages/db/demo';
import {demoAllowed,DomainError} from '@/packages/domain/policies';
import PractiSync from './practisync';
export const dynamic='force-dynamic';
export default async function Page(){
 const cfg=settings();
 let initial=null;
 let initialError:string|null=null;
 try{
  const h=await headers();
  const host=h.get('host')??'localhost';
  const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  const secureSession=/(?:^|;\s*)__Secure-authjs\.session-token=/.test(h.get('cookie')??'');
  const protocol=secureSession||!localHost?'https':'http';
  const user=await identity(new Request(`${protocol}://${host}/`,{headers:h}));
  initial=await snapshot(user);
 }catch(e){
  console.error('Page error:', e);
  if(!(e instanceof DomainError&&(e.status===401||e.status===503)))initialError='PractiSync could not load your workspace. Check your connection and try again.';
 }
 return <PractiSync initial={initial} initialError={initialError} demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} authConfigured={!!cfg.AUTH_SECRET}/>;
}
