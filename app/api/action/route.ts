import {identity} from '@/packages/auth/auth';
import {mutate} from '@/packages/domain/actions';
import {DomainError} from '@/packages/domain/policies';
import {inputs,type Action} from '@/packages/validation/contracts';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Request origin is not allowed.'},{status:403});if(Number(request.headers.get('content-length')??0)>20000)throw new DomainError('Request is too large.',413);const user=await identity(request);const body=await request.json() as {action?:string;values?:unknown};if(!body.action||!(body.action in inputs))throw new DomainError('Unknown action.');return Response.json(await mutate(user,body.action as Action,body.values),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):e instanceof DomainError?e.message:'The action could not be completed.'},{status:e instanceof DomainError?e.status:400});}}
