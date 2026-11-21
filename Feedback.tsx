import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info';

const TONE_STYLES: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', Icon: AlertTriangle },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  info: { box: 'border-navy-100 bg-navy-50 text-navy-800', Icon: Info },
};

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { box, Icon } = TONE_STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function Spinner({ label = 'Loading', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 text-sm text-navy-500 ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
      <span>{label}...</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Spinner label="Loading Wealth Doctor" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Info; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
