import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRoute } from '@/lib/router';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LearnPage } from '@/pages/LearnPage';
import { AdminPage } from '@/pages/AdminPage';
import { ClassroomDetail } from '@/pages/ClassroomDetail';
import { Shield, Plus, Edit } from 'lucide-react';

function AdminToolbar() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'admin@wealthdoctor.lk';
  if (!isAdmin) return null;
  return (
    <div className="bg-amber-600 text-white px-4 py-2 flex justify-between items-center shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Shield className="w-4 h-4" />
        <span>Wealth Doctor Admin Mode</span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="#/admin"
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs flex items-center gap-1 transition"
        >
          <Edit className="w-3 h-3" /> Go to Admin Dashboard
        </a>
      </div>
    </div>
  );
}

function Pages() {
  const route = useRoute();
  const [first, second] = route.segments;
  if (!first) return <LandingPage />;
  if (first === 'signin') return <AuthPage mode="signin" />;
  if (first === 'signup') return <AuthPage mode="signup" />;
  if (first === 'classroom' && second) {
    return <ClassroomDetail />;
  }
  if (first === 'dashboard') {
    return (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    );
  }
  if (first === 'learn' && second) {
    return (
      <RequireAuth>
        <LearnPage slug={second} lessonId={route.query.get('lesson')} />
      </RequireAuth>
    );
  }
  if (first === 'admin') {
    return (
      <RequireAuth adminOnly>
        <AdminPage />
      </RequireAuth>
    );
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-32 text-center">
      <h1 className="text-2xl font-bold text-navy-900">Page not found</h1>
      <a href="#/" className="btn-primary mt-6">Back to home</a>
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const isPlayer = route.segments[0] === 'learn';
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AdminToolbar />
      {!isPlayer && <SiteHeader />}
      <main className="flex-1">
        <Pages />
      </main>
      {!isPlayer && <SiteFooter />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}