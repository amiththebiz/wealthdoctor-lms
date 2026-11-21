import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Feedback';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const isSignUp = mode === 'signup';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  // Helper function to check and navigate based on user role/email
  const handleRedirect = (loggedInUser: any) => {
    if (!loggedInUser) return;
    const emailStr = loggedInUser.email || '';
    if (emailStr === 'admin@wealthdoctor.lk' || loggedInUser.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (user) {
      handleRedirect(user);
    }
  }, [user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isSignUp && !fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter your email address.');
    if (!password) return setError('Please enter your password.');

    setSubmitting(true);
    const targetEmail = email.trim().toLowerCase();

    const result = isSignUp
      ? await signUp({ email: targetEmail, password, fullName })
      : await signIn(targetEmail, password);
    setSubmitting(false);

    if (result) {
      setError(result);
      return;
    }

    if (targetEmail === 'admin@wealthdoctor.lk') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const result = await signInWithGoogle();
    setGoogleSubmitting(false);

    if (result) {
      setError(result);
      return;
    }

    if (user?.email === 'admin@wealthdoctor.lk') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 text-white lg:flex">
        <Logo light />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Your path to financial confidence starts here.
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-navy-300">
            Join thousands of students learning investing and personal finance from certified instructors.
          </p>
        </div>
        <p className="text-sm text-navy-400">Educational content only. Not personalized investment advice.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-navy-500">
            {isSignUp ? 'Already enrolled? ' : 'New to Wealth Doctor? '}
            <button
              type="button"
              onClick={() => navigate(isSignUp ? '/signin' : '/signup')}
              className="font-semibold text-emerald-700 hover:text-emerald-600"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              {googleSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.26 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 12s.43 3.88 1.19 5.42l4.09-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.26 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              {googleSubmitting ? 'Signing in with Google...' : 'Continue with Google'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="label">Full name</label>
                <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Jordan Lee" />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              />
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}