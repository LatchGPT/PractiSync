'use client';

import {useState} from 'react';
import {toast} from 'sonner';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {configurableRoles,moduleLabels,modules} from '@/packages/validation/features';
import type {Snapshot} from '@/packages/validation/contracts';

const roleLabels={STUDENT:'Student',COORDINATOR:'Coordinator',SUPERVISOR:'Supervisor'};
const roleModules={STUDENT:modules.filter(feature=>feature!=='policies'),COORDINATOR:modules.filter(feature=>feature!=='policies'),SUPERVISOR:modules.filter(feature=>feature!=='classes'&&feature!=='incidents')} as const;
export default function RoleSettings({data,onSaved}:{data:Snapshot;onSaved:()=>Promise<void>}){
 const [pending,setPending]=useState('');
 async function update(role:typeof configurableRoles[number],module:typeof modules[number],enabled:boolean){
  const key=`${role}:${module}`;setPending(key);
  try{const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'featureSetting',values:{role,module,enabled}})});const result=await response.json() as {error?:string;message?:string};if(!response.ok)throw new Error(result.error??'Could not update access.');await onSaved();toast.success(result.message??'Access updated.');}
  catch(error){toast.error(error instanceof Error?error.message:'Could not update access.');}finally{setPending('');}
 }
 return <div className="role-settings"><p className="small muted">Changes apply to new reads and actions immediately. Account management and profile access remain available to the Super Admin.</p>{configurableRoles.map(role=><Card key={role}><CardHeader><CardTitle>{roleLabels[role]}</CardTitle><CardDescription>Choose which modules this role can access.</CardDescription></CardHeader><CardContent><div className="role-settings-grid">{roleModules[role].map(module=>{const setting=data.featureSettings.find(row=>row.role===role&&row.module===module);const enabled=setting?Number(setting.enabled)===1:true;const id=`feature-${role}-${module}`;return <div className="role-setting" key={module}><div><Label htmlFor={id}>{moduleLabels[module]}</Label><p>{enabled?'Enabled':'Disabled'}</p></div><Switch id={id} checked={enabled} disabled={!!pending} onCheckedChange={checked=>update(role,module,checked)} aria-label={`${moduleLabels[module]} for ${roleLabels[role]}`}/></div>;})}</div></CardContent></Card>)}</div>;
}
