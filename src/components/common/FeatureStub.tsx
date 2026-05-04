import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  testId: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export const FeatureStub = ({ title, description, testId, icon: Icon, children }: Props) => (
  <div data-testid={testId} className="flex h-full flex-col">
    <header className="flex items-center gap-3 border-b border-border bg-surface px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </header>
    <div className="flex-1 overflow-auto p-6">
      {children ?? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-text-primary">
            This page is scaffolded. UI will land in its dedicated phase.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Folder: <code className="text-primary">src/features/{testId}</code>
          </p>
        </div>
      )}
    </div>
  </div>
);
