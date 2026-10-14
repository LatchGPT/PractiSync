import ErrorPage from './error-page';

export default function NotFound() {
  return <ErrorPage status={404} title="Page not found" description="The page you’re looking for isn’t available, or its address may have changed." />;
}
