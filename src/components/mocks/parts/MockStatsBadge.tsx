/**
 * MockStatsBadge — Postman-style hero stats strip rendered at the top of
 * the Mock detail page (Overview tab). Pure presentation — fed by the
 * Mock entity's `stats` block.
 */
import { Activity, CheckCircle2, XCircle, ShieldOff, Globe2, Clock } from 'lucide-react';

interface Stats {
  totalRequests?: number;
  matched?: number;
  unmatched?: number;
  proxied?: number;
  rateLimited?: number;
  validationErrors?: number;
  lastHitAt?: string;
}

const fmt = (n?: number) => (n ?? 0).toLocaleString();

export const MockStatsBadge = ({ stats }: { stats: Stats }) => {
  const items: Array<{
    icon: any; label: string; value: string; testId: string; tone: 'emerald' | 'red' | 'blue' | 'amber' | 'slate';
  }> = [
    { icon: Activity,      label: 'Total',          value: fmt(stats.totalRequests),    testId: 'stat-total',     tone: 'slate'  },
    { icon: CheckCircle2,  label: 'Matched',        value: fmt(stats.matched),          testId: 'stat-matched',   tone: 'emerald'},
    { icon: XCircle,       label: 'Unmatched',      value: fmt(stats.unmatched),        testId: 'stat-unmatched', tone: 'red'    },
    { icon: Globe2,        label: 'Proxied',        value: fmt(stats.proxied),          testId: 'stat-proxied',   tone: 'blue'   },
    { icon: ShieldOff,     label: 'Rate-limited',   value: fmt(stats.rateLimited),      testId: 'stat-rate',      tone: 'amber'  },
    { icon: Clock,         label: 'Last hit',       value: relTime(stats.lastHitAt),    testId: 'stat-last',      tone: 'slate'  },
  ];
  const tones: Record<string, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    red:     'border-red-500/30 bg-red-500/5 text-red-400',
    blue:    'border-blue-500/30 bg-blue-500/5 text-blue-400',
    amber:   'border-amber-500/30 bg-amber-500/5 text-amber-400',
    slate:   'border-border bg-surface/40 text-text-secondary',
  };
  return (
    <div data-testid="mock-stats-strip" className="grid grid-cols-2 gap-2 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.testId} data-testid={it.testId} className={`rounded-md border p-2.5 ${tones[it.tone]}`}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            <it.icon className="h-3 w-3" />
            {it.label}
          </div>
          <div className="mt-1 font-mono text-base font-bold">{it.value}</div>
        </div>
      ))}
    </div>
  );
};

const relTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch { return '—'; }
};
