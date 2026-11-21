import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { FullPageSpinner } from '@/components/ui/Feedback';

export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, loading, profile } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/signin');
  }, [loading, user]);

  if (loading) return <FullPageSpinner />;

  if (!user) return null;

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Admins only</h1>
        <p className="mt-2 text-sm text-navy-500">Your account does not have access to the admin dashboard.</p>
        <button type="button" onClick={() => navigate('/')} className="btn-primary mt-6">
          Back to courses
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
        <h1 className="text-2xl font-bold text-navy-900">Your profile is not ready</h1>
        <p className="mt-2 text-sm text-navy-500">
          We could not load your student profile. Refresh the page, or sign out and back in.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
