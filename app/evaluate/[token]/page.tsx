import GuestEvaluationForm from './form';

export const dynamic = 'force-dynamic';

export default async function GuestEvaluationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestEvaluationForm token={token} />;
}
