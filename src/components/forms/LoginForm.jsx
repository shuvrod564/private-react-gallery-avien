import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, resetPasswordSchema } from '../../schemas/authSchemas';
import { signIn, requestPasswordReset } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/env';
import { Field, Input } from '../ui/Field';
import { Button } from '../ui/Button';
import { ConfigMissing } from '../ui/Feedback';

export function LoginForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [serverError, setServerError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'sent'
  const [showPassword, setShowPassword] = useState(false);

  const login = useForm({ resolver: zodResolver(loginSchema) });
  const forgot = useForm({ resolver: zodResolver(resetPasswordSchema) });

  async function onLogin({ email, password }) {
    setServerError('');
    const { profile, error } = await signIn(email, password);
    if (error) {
      setServerError('Invalid email or password.');
      return;
    }
    if (profile?.role !== 'admin') {
      toast.error('This account does not have administrator access.');
      return;
    }
    await refreshProfile(profile.id);
    toast.success('Welcome back!');
    navigate('/admin', { replace: true });
  }

  async function onForgot({ email }) {
    const { error } = await requestPasswordReset(email);
    if (error) {
      setServerError(error);
      return;
    }
    setMode('sent');
  }

  if (!isSupabaseConfigured) {
    return (
      <ConfigMissing message="Admin login requires a Supabase project. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env, run the migration, then create an admin with `npm run create-admin`." />
    );
  }

  return (
    <div className="space-y-4">
      {mode === 'sent' ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            If an account exists for that email, we've sent a password reset link. Check your inbox.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setMode('login')}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form
          onSubmit={mode === 'login' ? login.handleSubmit(onLogin) : forgot.handleSubmit(onForgot)}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Email"
            htmlFor="email"
            required
            error={(mode === 'login' ? login.formState.errors.email : forgot.formState.errors.email)?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...(mode === 'login' ? login.register('email') : forgot.register('email'))}
            />
          </Field>

          {mode === 'login' && (
            <Field label="Password" htmlFor="password" required error={login.formState.errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...login.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          )}

          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            loading={mode === 'login' ? login.formState.isSubmitting : forgot.formState.isSubmitting}
            className="w-full"
            size="lg"
          >
            {mode === 'login' ? 'Sign in' : 'Send reset link'}
          </Button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => {
                setServerError('');
                setMode('forgot');
              }}
              className="block w-full text-center text-sm text-stone-500 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-white"
            >
              Forgot password?
            </button>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setServerError('');
                setMode('login');
              }}
              className="block w-full text-center text-sm text-stone-500 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-white"
            >
              Back to sign in
            </button>
          )}
        </form>
      )}
    </div>
  );
}