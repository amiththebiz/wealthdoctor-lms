import { useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { navigate, useRoute } from '@/lib/router';
import { Logo } from '@/components/layout/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NavLink {
  label: string;
  href?: string;
  section?: string;
}

function LinkItem({ link, className, onJump }: { link: NavLink; className: string; onJump: (section: string) => void }) {
  if (link.section) {
    const section = link.section;
    return (
      <button type="button" onClick={() => onJump(section)} className={className}>
        {link.label}
      </button>
    );
  }
  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

export function SiteHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const route = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('Wealth Doctor');
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const isHome = route.path === '/';
  const transparent = isHome && !scrolled && !menuOpen;

  // Load dynamic settings (Site Title & Logo) from Firestore
  useEffect(() => {
    async function loadHeaderSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'site_config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.siteTitle) setCustomTitle(data.siteTitle);
          if (data.logoUrl) setCustomLogo(data.logoUrl);
        }
      } catch (err) {
        console.error('Error loading header settings:', err);
      }
    }
    loadHeaderSettings();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [route.path]);

  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      transparent ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
    } ${active ? (transparent ? 'bg-white/10 text-white' : 'bg-navy-50 text-navy-900') : ''}`;

  const links: Array<{ label: string; href?: string; section?: string }> = [
    { label: 'Courses', section: 'courses' },
    ...(user ? [{ label: 'My Learning', href: '#/dashboard' }] : []),
    ...(isAdmin ? [{ label: 'Admin', href: '#/admin' }] : []),
  ];

  const jumpTo = (section: string) => {
    if (route.path !== '/') {
      navigate('/');
    }
    window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), route.path !== '/' ? 150 : 0);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        transparent ? 'bg-transparent' : 'border-b border-navy-100 bg-white/95 shadow-sm backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo light={transparent} customTitle={customTitle} customLogo={customLogo} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <LinkItem key={link.label} link={link} className={linkClass(false)} onJump={jumpTo} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isAdmin && (
                <a href="#/admin" className="btn-ghost text-xs">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </a>
              )}
              <a
                href="#/dashboard"
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition ${
                  transparent ? 'text-white hover:bg-white/10' : 'text-navy-800 hover:bg-navy-50'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="max-w-[140px] truncate">{profile?.full_name || 'My learning'}</span>
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className={`btn-ghost ${transparent ? 'text-white/90 hover:bg-white/10 hover:text-white' : ''}`}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <a href="#/signin" className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                transparent ? 'text-white hover:bg-white/10' : 'text-navy-800 hover:bg-navy-50'
              }`}>
                Sign in
              </a>
              <a href="#/signup" className="btn-primary">
                Get started
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`rounded-lg p-2 md:hidden ${transparent ? 'text-white' : 'text-navy-800'}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-navy-100 bg-white px-4 pb-6 pt-3 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((link) => (
              <LinkItem
                key={link.label}
                link={link}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                onJump={jumpTo}
              />
            ))}
            {user ? (
              <>
                <a href="#/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
                  <UserRound className="h-4 w-4" /> My learning
                </a>
                <button type="button" onClick={handleSignOut} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href="#/signin" className="btn-secondary">Sign in</a>
                <a href="#/signup" className="btn-primary">Get started</a>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
