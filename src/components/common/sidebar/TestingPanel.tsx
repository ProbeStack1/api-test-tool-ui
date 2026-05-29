// src/pages/testing/sidebar/TestingPanel.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Beaker, FileText, ListChecks, Library, Gauge, ShieldCheck,
  ChevronRight, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { SidebarShell } from './SidebarShell';
import { cn } from '@/utils/cn';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';

type TestingSection =
  | 'specs' | 'cases' | 'library' | 'functional' | 'load' | 'security';

interface NavRow {
  key: TestingSection;
  icon: LucideIcon;
  iconName?: IconName;
  label: string;
  sub: string;
  badge?: string | null;
}

export const TestingPanel = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [params, setParams] = useSearchParams();
  const section = (params.get('section') as TestingSection) || 'specs';

  // Optional: fetch badge counts (like total specs, total cases etc.)
  const [specsCount, setSpecsCount] = useState<number | null>(null);
  useEffect(() => {
    if (!workspaceId) return;
    // Example: fetchSpecsCount(workspaceId).then(setSpecsCount)
  }, [workspaceId]);

  const goToSection = (key: TestingSection) => {
    const next = new URLSearchParams();
    next.set('section', key);
    // Clear any deep IDs when switching section (optional)
    next.delete('specId');
    next.delete('runId');
    next.delete('loadRunId');
    setParams(next, { replace: true });
  };

  const NAV: NavRow[] = [
    { key: 'specs',      icon: FileText,    iconName: 'spec',   label: 'Specs',      sub: 'OpenAPI / Postman / HAR', badge: specsCount?.toString() },
    { key: 'cases',      icon: ListChecks,  iconName: 'testing', label: 'Test Cases',  sub: 'Generated assertions' },
    { key: 'library',    icon: Library,     iconName: 'apidoc',  label: 'Spec Library', sub: 'Org-wide reusable specs' },
    { key: 'functional', icon: Beaker,      iconName: 'functional-test', label: 'Functional Tests', sub: 'Run suites, assertions' },
    { key: 'load',       icon: Gauge,       iconName: 'load-test', label: 'Load Tests', sub: 'Throughput & p95' },
    { key: 'security',   icon: ShieldCheck, iconName: 'shield', label: 'Security Test', sub: 'OWASP · PII · rate limit' },
  ];

  return (
    <SidebarShell icon={Activity} title="Testing" testId="testing-panel">
      <div className="flex h-full flex-col">
        {/* Brand block */}
        <div className="space-y-1 p-3">
          <div className="rounded-lg border border-primary/40 bg-primary-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">API Testing</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Specs, cases, functional & load tests.
            </p>
          </div>
        </div>

        {/* Navigation rows */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {NAV.map(({ key, icon: Icon, iconName, label, sub, badge }) => {
            const active = section === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => goToSection(key)}
                data-testid={`testing-nav-${key}`}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                  active
                    ? 'bg-primary-muted text-primary'
                    : 'text-text-primary hover:bg-hover hover:text-white',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {iconName ? (
                    <AppIcon name={iconName} className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-primary')} />
                  ) : (
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-primary')} />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{label}</div>
                    <div className="truncate text-xs text-text-muted">{sub}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {badge && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 font-mono text-[11px]',
                      active ? 'bg-primary/30 text-primary' : 'bg-elevated text-text-muted',
                    )}>{badge}</span>
                  )}
                  {active && <ChevronRight className="h-3 w-3 text-primary" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="text-center text-[10px] text-text-muted">
            URL-driven · deep links supported
          </div>
        </div>
      </div>
    </SidebarShell>
  );
};