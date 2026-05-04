/**
 * ComingSoon — placeholder screen for testing modules whose backend
 * services aren't integrated yet (Functional, Load, Monitor). Each
 * lands the user with a clear "next shot will deliver this" message.
 */
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  port: number;
  testId: string;
}

export const ComingSoon = ({ icon: Icon, title, description, port, testId }: Props) => (
  <div className="flex h-full items-center justify-center p-8" data-testid={testId}>
    <div className="w-full max-w-xl rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-warning/[0.08]">
        <Icon className="h-10 w-10 text-warning" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-1 text-[10px] font-mono text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Java service ready · port {port}
        <span className="text-text-muted/60">|</span>
        UI integration in next shot
      </div>
    </div>
  </div>
);
