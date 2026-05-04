/**
 * VisibilityBadge + VisibilityIcon — one-stop shop for the three visibility
 * tones used everywhere a mock id is rendered.
 */
import { Globe, Building2, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MockVisibility } from '@/services/mock.service';

const META: Record<MockVisibility, { icon: any; label: string; cls: string; tip: string }> = {
  PUBLIC:  { icon: Globe,     label: 'Public',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', tip: 'Anyone with the URL can hit this mock' },
  ORG:     { icon: Building2, label: 'Org',     cls: 'bg-blue-500/15 text-blue-400 border-blue-500/40',          tip: 'Only authenticated users in your org' },
  PRIVATE: { icon: Lock,      label: 'Private', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/40',       tip: 'Only project members and explicit share grants' },
};

export const VisibilityBadge = ({
  visibility, size = 'sm', withLabel = true,
}: { visibility: MockVisibility; size?: 'xs' | 'sm' | 'md'; withLabel?: boolean }) => {
  const m = META[visibility];
  return (
    <span
      title={m.tip}
      data-testid={`visibility-${visibility.toLowerCase()}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded border font-medium',
        size === 'xs' ? 'h-4 px-1 text-[9px]'
        : size === 'sm' ? 'h-5 px-1.5 text-[10px]'
        : 'h-6 px-2 text-xs',
        m.cls,
      )}
    >
      <m.icon className={cn(size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {withLabel && m.label}
    </span>
  );
};
