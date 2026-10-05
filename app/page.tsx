import {headers} from 'next/headers';
import {identity} from '@/packages/auth/auth';
import {snapshot} from '@/packages/domain/read';
import {settings} from '@/packages/db/demo';
import {demoAllowed} from '@/packages/domain/policies';
import PractiSync from './practisync';
export const dynamic='force-dynamic';
export default async function Page(){
 const cfg=settings();
 let initial=null;
 try{
  const h=await headers();
  const host=h.get('host')??'localhost';
  const localHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)||host.includes('terminal.local');
  // A secure Auth.js cookie may reach this page through a loopback Worker proxy.
  const secureSession=/(?:^|;\s*)__Secure-authjs\.session-token=/.test(h.get('cookie')??'');
  const protocol=secureSession||!localHost?'https':'http';
  const user=await identity(new Request(`${protocol}://${host}/`,{headers:h}));
  initial=await snapshot(user);
 }catch{}
 return <PractiSync initial={initial} demo={demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)} authConfigured={!!cfg.AUTH_SECRET}/>;
}
