/**
 * MockCreateModal — premium create-mock dialog with 3 modes:
 *
 *   1. SCRATCH      — name + slug + visibility, then optionally seed
 *                     a few starter endpoints inline.
 *   2. FROM_COLL    — pick an existing collection in the project; the
 *                     BFF builds a mock seeded with every request in
 *                     that collection.
 *   3. FROM_MOCK    — clone an existing mock (deep-copy endpoints).
 *
 * Replaces the previous browser-prompt flow.
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Server, Plus, Boxes, Copy, Lock, Globe, Building2, Check, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  listMocks, createMock, listEndpoints, createEndpoint, buildMockFromCollection,
  type MockVisibility,
} from '@/services/mock.service';
import { listCollections } from '@/services/collection.service';
import { cn } from '@/utils/cn';

type Mode = 'SCRATCH' | 'FROM_COLL' | 'FROM_MOCK';

export const MockCreateModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('SCRATCH');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<MockVisibility>('PRIVATE');
  const [busy, setBusy] = useState(false);
  const [pickedCollection, setPickedCollection] = useState<string | null>(null);
  const [pickedMock, setPickedMock] = useState<string | null>(null);

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', ws?.id],
    queryFn: () => listCollections(ws!.id),
    enabled: !!ws?.id && open && mode === 'FROM_COLL',
  });
  const { data: existingMocks = [] } = useQuery({
    queryKey: ['mocks', ws?.id],
    queryFn: () => listMocks(ws?.id),
    enabled: !!ws?.id && open && mode === 'FROM_MOCK',
  });

  useEffect(() => {
    if (!open) {
      setMode('SCRATCH'); setName(''); setSlug(''); setVisibility('PRIVATE');
      setPickedCollection(null); setPickedMock(null); setBusy(false);
    }
  }, [open]);

  // Auto-derive slug from name (kebab) — user can override.
  useEffect(() => {
    if (mode === 'SCRATCH') setSlug(slugify(name));
  }, [name, mode]);

  if (!open) return null;

  const submit = async () => {
    if (!ws) return;
    try {
      setBusy(true);
      let createdId: string | null = null;
      if (mode === 'SCRATCH') {
        if (!name.trim()) { toast.error('Mock name is required'); return; }
        const m = await createMock(ws.id, {
          name: name.trim(),
          slug: slug.trim() || undefined,
          visibility,
          description: '',
        } as any);
        createdId = (m as any).id;
        toast.success(`Mock "${name}" created`);
      } else if (mode === 'FROM_COLL') {
        if (!pickedCollection) { toast.error('Pick a collection first'); return; }
        const col = collections.find((c) => c.id === pickedCollection);
        const m = await buildMockFromCollection(pickedCollection, ws.id, {
          slug: slug.trim() || undefined,
          name: (name.trim() || `${col?.name ?? 'Mock'} (mock)`),
        });
        createdId = (m as any).id;
        toast.success(`Mock built from "${col?.name}"`);
      } else if (mode === 'FROM_MOCK') {
        if (!pickedMock) { toast.error('Pick a source mock first'); return; }
        const src = existingMocks.find((m) => m.id === pickedMock);
        if (!src) return;
        // Deep clone: create empty mock + replicate endpoints.
        const cloneName = name.trim() || `${src.name} Copy`;
        const m = await createMock(ws.id, {
          name: cloneName,
          slug: slug.trim() || undefined,
          visibility: src.visibility,
          description: src.description || '',
        } as any);
        createdId = (m as any).id;
        const eps = await listEndpoints(src.id);
        for (const ep of eps) {
          await createEndpoint(createdId!, {
            method: ep.method, pathPattern: ep.pathPattern,
            pathMatchMode: (ep as any).pathMatchMode ?? 'LITERAL',
            priority: ep.priority ?? 100, enabled: ep.enabled ?? true,
            responses: ep.responses,
            responseSelection: (ep as any).responseSelection,
            matchers: (ep as any).matchers, validation: (ep as any).validation,
            chaos: (ep as any).chaos, activeWindow: (ep as any).activeWindow,
            name: ep.name,
          } as any);
        }
        toast.success(`Cloned ${eps.length} endpoint(s)`);
      }
      await qc.invalidateQueries({ queryKey: ['mocks', ws.id] });
      onClose();
      if (createdId) nav(`/projects/mocks/${createdId}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create new mock server"
      icon={Server}
      testId="mock-create-modal"
      footer={
        <>
          <Button variant="outline" data-testid="create-cancel" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            data-testid="create-submit"
            disabled={busy ||
              (mode === 'SCRATCH'   && !name.trim()) ||
              (mode === 'FROM_COLL' && !pickedCollection) ||
              (mode === 'FROM_MOCK' && !pickedMock)
            }
            onClick={submit}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Create mock
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode picker */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ModeCard
            icon={Plus}        label="From scratch"      tip="Start blank — add endpoints one-by-one."
            testId="create-mode-scratch" active={mode === 'SCRATCH'}   onClick={() => setMode('SCRATCH')}
          />
          <ModeCard
            icon={Boxes}       label="From a collection" tip="Seed every request in a collection as a mock endpoint."
            testId="create-mode-coll"     active={mode === 'FROM_COLL'} onClick={() => setMode('FROM_COLL')}
          />
          <ModeCard
            icon={Copy}        label="Clone existing"    tip="Deep-copy another mock's settings + endpoints."
            testId="create-mode-mock"     active={mode === 'FROM_MOCK'} onClick={() => setMode('FROM_MOCK')}
          />
        </div>

        {/* Source picker */}
        {mode === 'FROM_COLL' && (
          <div data-testid="create-coll-picker">
            <Label>Source collection</Label>
            <select
              data-testid="create-coll-select"
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
              value={pickedCollection ?? ''}
              onChange={(e) => setPickedCollection(e.target.value || null)}
            >
              <option value="">— pick a collection —</option>
              {collections.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
        )}
        {mode === 'FROM_MOCK' && (
          <div data-testid="create-mock-picker">
            <Label>Source mock</Label>
            <select
              data-testid="create-mock-select"
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-text-primary"
              value={pickedMock ?? ''}
              onChange={(e) => setPickedMock(e.target.value || null)}
            >
              <option value="">— pick a mock —</option>
              {existingMocks.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
        )}

        {/* Common name + slug + visibility */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Mock name</Label>
            <input
              data-testid="create-mock-name"
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-text-primary outline-none focus:border-primary"
              placeholder={mode === 'SCRATCH' ? 'e.g. Stripe sandbox' : '(optional override)'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Slug</Label>
            <input
              data-testid="create-mock-slug"
              className="h-8 w-full rounded-md border border-border bg-surface px-2 font-mono text-xs text-text-primary outline-none focus:border-primary"
              placeholder="auto from name"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
        </div>
        {mode === 'SCRATCH' && (
          <div>
            <Label>Visibility</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['PRIVATE','ORG','PUBLIC'] as MockVisibility[]).map((v) => {
                const Ico = v === 'PUBLIC' ? Globe : v === 'ORG' ? Building2 : Lock;
                const tip = v === 'PUBLIC' ? 'Anyone with URL'
                          : v === 'ORG' ? 'Org-members only' : 'Workspace + grants only';
                const active = visibility === v;
                return (
                  <button
                    key={v}
                    type="button"
                    data-testid={`create-vis-${v.toLowerCase()}`}
                    onClick={() => setVisibility(v)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border p-2 text-left text-[11px] transition-colors',
                      active ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-hover',
                    )}
                  >
                    <Ico className="h-3.5 w-3.5" />
                    <div className="min-w-0">
                      <div className="font-semibold">{v}</div>
                      <div className="text-text-muted">{tip}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{children}</div>
);

const ModeCard = ({
  icon: Icon, label, tip, active, onClick, testId,
}: { icon: any; label: string; tip: string; active: boolean; onClick: () => void; testId: string }) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    className={cn(
      'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
      active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-hover',
    )}
  >
    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-text-muted')} />
    <span className={cn('text-xs font-semibold', active ? 'text-primary' : 'text-text-primary')}>{label}</span>
    <span className="text-[10px] text-text-muted">{tip}</span>
  </button>
);

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
