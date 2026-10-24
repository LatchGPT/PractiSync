import ErrorPage from './error-page';

export default function ForbiddenPage() {
  return <ErrorPage status={403} title="Access denied" description="Your account doesn’t have permission to view this page. Go back to your RTU PractiSync workspace and continue from there." />;
}
