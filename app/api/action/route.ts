import { withConsent } from '@/packages/privacy/api-guard';
import {identity} from '@/packages/auth/auth';
import {mutate} from '@/packages/domain/actions';
import {DomainError} from '@/packages/domain/policies';
import {inputs,type Action} from '@/packages/validation/contracts';
import {readJsonObject,RequestBodyError} from '@/packages/validation/request-body';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
async function handlerPOST(request:Request){try{const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Request origin is not allowed.'},{status:403,headers:{'Cache-Control':'no-store'}});const body=await readJsonObject(request,6_000_000);if(typeof body.action!=='string'||!Object.hasOwn(inputs,body.action))throw new DomainError('Unknown action.');const user=await identity(request);return Response.json(await mutate(user,body.action as Action,body.values),{headers:{'Cache-Control':'no-store'}});}catch(e){const status=e instanceof RequestBodyError?e.status:e instanceof DomainError?e.status:400;const message=e instanceof RequestBodyError||e instanceof DomainError?e.message:e instanceof ZodError?e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):'The action could not be completed.';return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}}

export const POST=withConsent(handlerPOST);
