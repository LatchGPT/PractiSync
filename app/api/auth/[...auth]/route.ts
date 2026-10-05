import {authHandler} from '@/packages/auth/auth';
import {DomainError} from '@/packages/domain/policies';
export const dynamic='force-dynamic';
async function handler(request:Request){try{return await authHandler(request);}catch(e){return Response.json({error:e instanceof DomainError?e.message:'Sign-in is temporarily unavailable.'},{status:e instanceof DomainError?e.status:503});}}
export {handler as GET,handler as POST};
