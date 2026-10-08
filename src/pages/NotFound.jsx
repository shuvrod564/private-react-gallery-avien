import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found', { description: 'The page you are looking for does not exist.' });
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Compass className="h-14 w-14 text-stone-300 dark:text-stone-600" aria-hidden />
      <h1 className="mt-6 font-display text-5xl font-semibold">404</h1>
      <p className="mt-3 text-stone-500 dark:text-stone-400">This page doesn't exist or has been moved.</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-stone-900 px-6 text-sm font-medium text-white hover:bg-stone-700 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
      >
        Back to home
      </Link>
    </div>
  );
}
