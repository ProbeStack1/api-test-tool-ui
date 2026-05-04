/**
 * SpecDetailPage — `/projects/testing/specs/:id`.
 *
 * Top header: name + status/format badges + actions (back · delete · export menu).
 * Inline tab strip: Overview · Content · Test Cases · Generate · Export.
 * Each tab is a self-contained component talking to the spec service.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Trash2, ArchiveRestore, Pencil, Download, Hash, FileText,
  ListChecks, Sparkles, Eye, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTestingStore } from '@/stores/testing.store';
import {
  getTestSpec, archiveTestSpec, restoreTestSpec, updateTestSpec,
  type TestSpec,
} from '@/services/testSpec.service';
import { FormatBadge, StatusBadge, formatBytes, formatRelative } from '../shared/Badges';
import { SpecOverviewTab } from './tabs/SpecOverviewTab';
import { SpecContentTab }  from './tabs/SpecContentTab';
import { SpecCasesTab }    from './tabs/SpecCasesTab';
import { SpecGenerateTab } from './tabs/SpecGenerateTab';
import { SpecExportTab }   from './tabs/SpecExportTab';
import { cn } from '@/utils/cn';

type TabKey = 'overview' | 'content' | 'cases' | 'generate' | 'export';

const TABS: { key: TabKey; label: string; icon: any; testId: string }[] = [
  { key: 'overview', label: 'Overview',   icon: Eye,         testId: 'spec-tab-overview' },
  { key: 'content',  label: 'Content',    icon: FileText,    testId: 'spec-tab-content' },
  { key: 'cases',    label: 'Test Cases', icon: ListChecks,  testId: 'spec-tab-cases' },
  { key: 'generate', label: 'Generate',   icon: Sparkles,    testId: 'spec-tab-generate' },
  { key: 'export',   label: 'Export',     icon: Download,    testId: 'spec-tab-export' },
];

export const SpecDetailPage = () => {
  const id = useTestingStore((s) => s.selectedSpecId);
  const closeSpec = useTestingStore((s) => s.closeSpec);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('overview');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const specQ = useQuery({
    queryKey: ['testSpec', 'detail', id],
    queryFn: () => getTestSpec(id!),
    enabled: !!id,
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveTestSpec(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec'] }),
  });
  const restoreMut = useMutation({
    mutationFn: () => restoreTestSpec(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['testSpec'] }),
  });

  if (!id) return null;
  const spec = specQ.data;

  return (
    <div className="flex h-full flex-col" data-testid="spec-detail-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => closeSpec()}
            data-testid="spec-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Specs
          </Button>
          <span className="text-text-muted">/</span>
          {specQ.isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <h1 className="truncate text-sm font-semibold tracking-tight" data-testid="spec-detail-name">
              {spec?.name ?? '—'}
            </h1>
          )}
          {spec && <FormatBadge format={spec.format} />}
          {spec && <StatusBadge status={String(spec.status)} />}
          <div className="ml-auto flex items-center gap-1">
            {spec && spec.status === 'ARCHIVED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => restoreMut.mutate()}
                data-testid="spec-restore-btn"
                disabled={restoreMut.isPending}
              >
                {restoreMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRenameOpen(true)}
              data-testid="spec-rename-btn"
              disabled={!spec}
            >
              <Pencil className="h-3.5 w-3.5" /> Rename
            </Button>
            {spec && spec.status !== 'ARCHIVED' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmArchive(true)}
                data-testid="spec-archive-btn"
              >
                <Trash2 className="h-3.5 w-3.5" /> Archive
              </Button>
            )}
          </div>
        </div>

        {/* Sub stats */}
        {spec && (
          <div className="mt-1.5 flex items-center gap-4 text-[10px] text-text-muted" data-testid="spec-meta-strip">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{spec.contentHash.slice(0, 12)}</span>
            </span>
            <span>· {formatBytes(spec.fileSize)}</span>
            <span>· {spec.testCaseCount} cases</span>
            <span>· source: {spec.source}</span>
            {spec.importUrl && <span className="truncate">· {spec.importUrl}</span>}
            <span className="ml-auto">updated {formatRelative(typeof spec.updatedAt === 'string' ? spec.updatedAt : '')}</span>
          </div>
        )}

        {/* Tabs */}
        <nav role="tablist" className="-mb-px mt-3 flex gap-1" data-testid="spec-tabs">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                data-testid={t.testId}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 overflow-auto">
        {!spec || specQ.isLoading ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {tab === 'overview' && <SpecOverviewTab spec={spec} />}
            {tab === 'content'  && <SpecContentTab specId={spec.testSpecId} />}
            {tab === 'cases'    && <SpecCasesTab spec={spec} onGoToGenerate={() => setTab('generate')} />}
            {tab === 'generate' && <SpecGenerateTab spec={spec} />}
            {tab === 'export'   && <SpecExportTab spec={spec} />}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this spec?"
        description={`"${spec?.name ?? ''}" will be archived for 30 days then permanently deleted. You can restore it any time before purge.`}
        confirmText="Archive"
        tone="warning"
        onConfirm={async () => { await archiveMut.mutateAsync(); }}
      />

      {spec && renameOpen && (
        <RenameSpecModal
          spec={spec}
          onClose={() => setRenameOpen(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['testSpec', 'detail', id] })}
        />
      )}
    </div>
  );
};

const RenameSpecModal = ({
  spec, onClose, onSaved,
}: { spec: TestSpec; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState(spec.name);
  const [description, setDescription] = useState(spec.description ?? '');
  const mut = useMutation({
    mutationFn: () => updateTestSpec(spec.testSpecId, { name: name.trim(), description: description.trim() || null }),
    onSuccess: () => { onSaved(); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl border border-border bg-elevated p-5 shadow-2xl" data-testid="spec-rename-modal">
        <h2 className="mb-3 text-sm font-semibold">Rename spec</h2>
        <label className="mb-3 block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Name</span>
          <input
            data-testid="spec-rename-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </label>
        <label className="mb-4 block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Description</span>
          <textarea
            data-testid="spec-rename-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-y rounded border border-border bg-probestack-bg px-2 py-1.5 text-xs"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="spec-rename-cancel">Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => mut.mutate()}
            disabled={!name.trim() || mut.isPending}
            data-testid="spec-rename-save"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
};
