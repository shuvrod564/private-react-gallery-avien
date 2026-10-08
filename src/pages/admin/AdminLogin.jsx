import { Camera, ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminLogin() {
  useDocumentTitle('Admin login', { description: 'Administrator sign in.' });
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-stone-100 to-stone-200 px-4 py-12 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-stone-900 text-brand-400 dark:bg-stone-800">
            <Camera className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Administrator sign in</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Restricted area — admins only
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
