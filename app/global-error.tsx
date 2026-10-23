'use client';

import { useEffect } from 'react';
import ErrorPage from './error-page';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('PractiSync root error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <title>PractiSync · Error</title>
        <ErrorPage status={500} title="Something went wrong" description="An unexpected problem interrupted this page. You can try again or return to where you came from." retry={retry} />
      </body>
    </html>
  );
}
