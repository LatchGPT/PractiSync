'use client';

import { useEffect } from 'react';
import ErrorPage from './error-page';

export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('PractiSync page error:', error);
  }, [error]);

  return <ErrorPage status={500} title="Something went wrong" description="An unexpected problem interrupted this page. You can try again or return to where you came from." retry={retry} />;
}
