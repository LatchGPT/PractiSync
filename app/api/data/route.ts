import {identity} from '@/packages/auth/auth';
import {snapshot} from '@/packages/domain/read';
import {DomainError} from '@/packages/domain/policies';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json(await snapshot(await identity(request)),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return Response.json({error:e instanceof DomainError?e.message:'Records are temporarily unavailable.'},{status:e instanceof DomainError?e.status:503});}}
