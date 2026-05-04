/**
 * FancyEmpty — reusable empty-state card with an auto-playing Lordicon
 * animation as the hero, a short title, a descriptive body, and optional
 * CTA + how-to-use steps. Used everywhere a page / pane has no data yet,
 * so the app always feels alive — never flatly blank.
 *
 *   <FancyEmpty
 *     testId="monitors-empty"
 *     icon="monitor"
 *     title="No monitors yet"
 *     body="Schedule a probe to watch your APIs 24/7."
 *     steps={["Pick a target endpoint", "Set an interval", "Wire alerts"]}
 *     ctaLabel="Create monitor"
 *     onCta={() => setShowForm(true)}
 *   />
 */
import type { ReactNode } from 'react';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface FancyEmptyProps {
  testId: string;
  icon: IconName;
  title: string;
  body: string;
  /** Optional how-to-use bullet list. */
  steps?: string[];
  /** Optional primary action. */
  ctaLabel?: string;
  onCta?: () => void;
  ctaTestId?: string;
  /** Extra content rendered below the CTA (tips, links, sample payloads). */
  children?: ReactNode;
  className?: string;
  /** Size of the animated hero icon (px). Defaults to 96. */
  iconSize?: number;
}

export const FancyEmpty = ({
  testId, icon, title, body, steps, ctaLabel, onCta, ctaTestId,
  children, className, iconSize = 96,
}: FancyEmptyProps) => (
  <div
    data-testid={testId}
    className={cn(
      'mx-auto flex w-full max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center',
      className,
    )}
  >
    <div className="relative mb-4 grid place-items-center">
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <AppIcon name={icon} animated autoPlay size={iconSize} className="relative text-primary" />
    </div>
    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
    <p className="mx-auto mt-1.5 max-w-sm text-xs text-text-muted">{body}</p>

    {steps && steps.length > 0 && (
      <ol className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-[11px] text-text-secondary">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[9px] font-semibold text-primary">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    )}

    {ctaLabel && onCta && (
      <Button
        size="sm"
        variant="primary"
        onClick={onCta}
        className="mt-5"
        data-testid={ctaTestId ?? `${testId}-cta`}
      >
        {ctaLabel}
      </Button>
    )}

    {children && <div className="mt-4 w-full">{children}</div>}
  </div>
);
