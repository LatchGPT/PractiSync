import { redirect } from 'next/navigation';
import { pageIdentity } from '@/app/server-identity';
import { DomainError } from '@/packages/domain/policies';
import { dashboardPathForRole } from '@/packages/auth/routes';
import { studentVerificationContext } from '@/packages/domain/student-verification';
import StudentVerificationGate from '@/app/student-verification-gate';
import {settings} from '@/packages/db/demo';
import {demoAllowed} from '@/packages/domain/policies';
import type {StudentVerificationContext} from '@/packages/validation/student-verification';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Student registration · RTU PractiSync' };
export default async function StudentVerificationPage() {
 let user;
 try { user = await pageIdentity(true); }
 catch (error) { if (error instanceof DomainError && error.status === 401) redirect('/login'); return unavailable(error instanceof DomainError && error.status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE'); }
 if (user.role !== 'STUDENT') redirect(dashboardPathForRole(user.role));
 let context: StudentVerificationContext;
 try { context = await studentVerificationContext(user); } catch (error) { return unavailable(error instanceof DomainError && error.status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE'); }
 if (context.request.status === 'APPROVED') redirect('/dashboard/student');
 return <StudentVerificationGate initial={context}/>;
}

function unavailable(status = 'UNAVAILABLE') {
 const cfg=settings();
 return <StudentVerificationGate initial={{email:'',name:'',request:{id:'',tenantId:'',createdAt:'',status},courses:[],sections:[],demo:demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED)}}/>;
}
