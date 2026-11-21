import { Landmark } from 'lucide-react';
import { navigate } from '@/lib/router';

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-100 bg-navy-950 text-navy-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold text-white">Wealth Doctor Institute</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-navy-400">
            Practical financial education for everyday investors and professional traders. Learn from certified instructors, build a
            disciplined strategy, and track your progress every step of the way.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Programs</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>Stock Market Investing</li>
            <li>Personal Financial Management</li>
            <li>Advanced Trading Strategies</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Account</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <button type="button" onClick={() => navigate('/signin')} className="transition hover:text-white">
                Sign in
              </button>
            </li>
            <li>
              <button type="button" onClick={() => navigate('/signup')} className="transition hover:text-white">
                Create account
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-navy-500 sm:px-6 lg:px-8">
          Educational content only. Nothing on this site is personalized investment advice.
        </p>
      </div>
    </footer>
  );
}
