import { Landmark } from 'lucide-react';
import { navigate } from '@/lib/router';

interface LogoProps {
  light?: boolean;
  customTitle?: string;
  customLogo?: string | null;
}

export function Logo({ light = false, customTitle = 'Wealth Doctor', customLogo = null }: LogoProps) {
  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="group flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      aria-label="Wealth Doctor home"
    >
      {customLogo ? (
        <img src={customLogo} alt="Logo" className="h-9 max-w-[120px] object-contain rounded-lg shadow-sm" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm transition group-hover:bg-emerald-400">
          <Landmark className="h-5 w-5" strokeWidth={2.25} />
        </span>
      )}
      <span className="flex flex-col text-left leading-none">
        <span className={`text-base font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-900'}`}>
          {customTitle}
        </span>
        <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-emerald-300' : 'text-emerald-600'}`}>
          Institute
        </span>
      </span>
    </button>
  );
}
