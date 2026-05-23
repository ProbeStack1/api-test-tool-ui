/**
 * StatusBar — compact UP/DOWN counts + breaker state.
 */
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Stat { totalServers: number; up: number; down: number; unknown: number }
interface Breaker { state: string; failureRatio: number; sampleSize: number }

export const StatusBar = ({ stat, breaker }: { stat?: Stat; breaker?: Breaker }) => {
  const breakerTone = breaker?.state === 'OPEN'   ? 'danger'
                    : breaker?.state === 'HALF_OPEN' ? 'warning'
                    : 'success';
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs" data-testid="mcp-status-bar">
      <Pill icon={Activity} tone={stat && stat.up > 0 ? 'success' : 'muted'}
            label={`${stat?.up ?? 0}/${stat?.totalServers ?? 0} up`}
            testId="mcp-status-up" />
      {stat && stat.down > 0 && (
        <Pill icon={AlertTriangle} tone="danger" label={`${stat.down} down`} testId="mcp-status-down" />
      )}
      <Pill
        icon={CheckCircle2}
        tone={breakerTone as any}
        label={`Breaker · ${breaker?.state ?? 'CLOSED'}`}
        testId="mcp-status-breaker"
      />
    </div>
  );
};

const Pill = ({
  icon: Icon, tone, label, testId,
}: {
  icon: any; tone: 'success' | 'warning' | 'danger' | 'muted';
  label: string; testId: string;
}) => (
  <span
    data-testid={testId}
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
      tone === 'success' && 'border-success/40 bg-success-muted text-success',
      tone === 'warning' && 'border-warning/40 bg-warning-muted text-warning',
      tone === 'danger'  && 'border-danger/40 bg-danger-muted text-danger',
      tone === 'muted'   && 'border-border bg-elevated text-text-muted',
    )}
  >
    <Icon className="h-2.5 w-2.5" />
    {label}
  </span>
);
