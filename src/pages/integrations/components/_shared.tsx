/**
 * Shared primitives for the IntegrationsPage panes — Field, Tile, KV,
 * relative-time formatter, and the Empty-state shell.
 */
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import type { IconName } from '@/components/icons/AppIcons';

export const inputCls =
  'h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-xs shadow-inner';

export const fmtRelative = (iso?: string | number | null): string => {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

export const Field = ({ label, required, className, children }: {
  label: string; required?: boolean; className?: string; children: ReactNode;
}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    {children}
  </label>
);

export const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string;
  tone?: 'default' | 'primary' | 'success' | 'danger'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    primary: 'text-primary',
    success: 'text-success',
    danger:  'text-danger',
  };
  return (
    <div data-testid={testId} className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('text-2xl font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

export const KV = ({ k, children }: { k: string; children: ReactNode }) => (
  <div>
    <dt className="text-[9px] uppercase tracking-wider text-text-muted">{k}</dt>
    <dd className="font-mono text-[11px] text-text-secondary">{children}</dd>
  </div>
);

/**
 * EmptyShell — legacy thin wrapper for the integrations pane empty
 * states. Still used in a handful of places; new code should prefer
 * `<FancyEmpty>` directly for the animated hero treatment.
 */
export const EmptyShell = ({ testId, icon, title, body, steps, ctaLabel, onCta }: {
  testId: string; icon: IconName | any; title: string; body: string;
  steps?: string[]; ctaLabel?: string; onCta?: () => void;
}) => {
  // Legacy call sites pass a Lucide icon component; route those to a concept.
  const name: IconName = typeof icon === 'string' ? (icon as IconName) : 'webhook';
  return (
    <FancyEmpty
      testId={testId}
      icon={name}
      title={title}
      body={body}
      steps={steps}
      ctaLabel={ctaLabel}
      onCta={onCta}
    />
  );
};
