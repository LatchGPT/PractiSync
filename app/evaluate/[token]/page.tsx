import GuestEvaluationForm from './form';
import { pageIdentity } from '@/app/server-identity';
import { redirect } from 'next/navigation';
import { DomainError } from '@/packages/domain/policies';

export const dynamic = 'force-dynamic';

export default async function GuestEvaluationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try{await pageIdentity(true);}catch(error){if(error instanceof DomainError&&error.status===401)redirect('/login?redirect='+encodeURIComponent('/evaluate/'+token));throw error;}
  return <GuestEvaluationForm token={token} />;
}
