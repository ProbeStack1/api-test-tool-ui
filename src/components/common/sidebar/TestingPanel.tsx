import { useState } from 'react';
import { BookOpen, ClipboardList, Play, BarChart3, Activity, LineChart, TestTube2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarShell } from './SidebarShell';
import { cn } from '@/utils/cn';

const ITEMS: { key: string; icon: LucideIcon; label: string }[] = [
  { key: 'spec', icon: BookOpen, label: 'Spec Library' },
  { key: 'cases', icon: ClipboardList, label: 'Test Cases' },
  { key: 'functional', icon: Play, label: 'Functional Test' },
  { key: 'load', icon: BarChart3, label: 'Load Test' },
  { key: 'mcp', icon: Activity, label: 'MCP Test' },
  { key: 'tracing', icon: LineChart, label: 'Tracing' },
];

export const TestingPanel = () => {
  const [active, setActive] = useState('spec');
  return (
    <SidebarShell icon={TestTube2} title="Testing" testId="testing-panel">
      <nav className="space-y-1 p-2">
        {ITEMS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            data-testid={`testing-${key}`}
            onClick={() => setActive(key)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
              active === key
                ? 'border-primary bg-primary-muted text-primary'
                : 'border-border bg-transparent text-text-primary hover:border-primary/40 hover:text-primary',
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>
    </SidebarShell>
  );
};
