/**
 * EndpointsTab — premium endpoint manager.
 *
 * Layout:
 *   • Header: title + count + "Add endpoint" button.
 *   • Inline "new endpoint" draft when adding.
 *   • Endpoint rows. Each row shows method/path/status with quick
 *     toggle / Test (Send → Runner tab) / Open / Delete actions.
 *     Click the path opens the advanced editor with these sections:
 *       Response (status, body, headers)
 *       Variants     — multiple responses with weights/selection
 *       Matchers     — query / header / JSONPath / body-contains
 *       Validation   — required headers, content-type, JSON Schema
 *       Chaos        — error rate, latency jitter, fixed delay
 *       Active window — start/end ISO timestamps
 *
 * The previous inline `MockEndpointRunner` is GONE — testing happens
 * in a dedicated "Runner" tab on the detail page (see RunnerTab.tsx).
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Power, Trash2, Check, PlayCircle, ListTree, Send, ChevronDown, ChevronRight,
  Filter, Shield, Zap, Layers, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { RowConfirm } from '@/components/common/sidebar/collections/RowConfirm';
import {
  createEndpoint, updateEndpoint, deleteEndpoint, toggleEndpoint,
  type MockServer, type MockEndpoint,
} from '@/services/mock.service';
import { MethodBadge } from '../parts/MethodBadge';
import { StatusBadge } from '../parts/StatusBadge';
import { cn } from '@/utils/cn';

export const EndpointsTab = ({
  mock, endpoints, onRunEndpoint,
}: { mock: MockServer; endpoints: MockEndpoint[]; onRunEndpoint?: (epId: string) => void }) => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { id: mockId } = useParams<{ id: string }>();
  const [adding, setAdding] = useState(false);

  const addMut = useMutation({
    mutationFn: async (body: Partial<MockEndpoint>) => createEndpoint(mock.id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mock', mock.id, 'endpoints'] });
      await qc.invalidateQueries({ queryKey: ['mocks'] });
      toast.success('Endpoint created');
    },
  });

  const openRunner = (epId: string) => {
    nav(`/projects/mocks/${mockId}?ep=${epId}`, { replace: true });
    onRunEndpoint?.(epId);
  };

  return (
    <div className="space-y-3 p-4" data-testid="mock-endpoints-tab">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ListTree className="h-3.5 w-3.5 text-primary" /> Endpoints
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{endpoints.length}</span>
        </h3>
        <Button variant="primary" data-testid="endpoints-add-btn" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add endpoint
        </Button>
      </header>

      {adding && (
        <NewEndpointDraft
          onCancel={() => setAdding(false)}
          onSave={async (body) => { await addMut.mutateAsync(body); setAdding(false); }}
        />
      )}

      {endpoints.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed border-border bg-surface/40 p-12 text-center" data-testid="endpoints-empty">
          <ListTree className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <div className="text-sm font-medium">No endpoints yet</div>
          <div className="mt-1 text-xs text-text-muted">Click <strong>Add endpoint</strong> to create your first rule.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          {endpoints.map((ep) => (
            <EndpointRow key={ep.id} mockId={mock.id} mockSlug={mock.slug} ep={ep} onRun={() => openRunner(ep.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const NewEndpointDraft = ({
  onCancel, onSave,
}: { onCancel: () => void; onSave: (body: Partial<MockEndpoint>) => Promise<void> }) => {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('');
  const [status, setStatus] = useState(200);
  const [body, setBody] = useState('{\n  "ok": true\n}');
  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 p-3" data-testid="endpoints-new-draft">
      <header className="mb-2 text-xs font-semibold">New endpoint</header>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          data-testid="endpoints-new-method"
          className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs"
        >
          {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','*'].map((m) => <option key={m} value={m}>{m === '*' ? 'ANY' : m}</option>)}
        </select>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/users/{id}"
          data-testid="endpoints-new-path"
          className="h-7 flex-1 rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs"
        />
        <input
          type="number"
          value={status}
          onChange={(e) => setStatus(parseInt(e.target.value) || 200)}
          data-testid="endpoints-new-status"
          className="h-7 w-20 rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        data-testid="endpoints-new-body"
        className="mt-2 h-24 w-full resize-none rounded-md border border-border bg-probestack-bg p-2 font-mono text-xs outline-none focus:border-primary"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} data-testid="endpoints-new-cancel">Cancel</Button>
        <Button
          variant="primary"
          data-testid="endpoints-new-save"
          disabled={!path.trim()}
          onClick={() => onSave({
            method, pathPattern: path,
            responses: [{ statusCode: status, bodyLanguage: 'json', body }],
          } as any)}
        >
          <Check className="h-3.5 w-3.5" /> Create
        </Button>
      </div>
    </div>
  );
};

type AdvSection = 'response' | 'variants' | 'matchers' | 'validation' | 'chaos' | 'window';

const EndpointRow = ({
  mockId, mockSlug, ep, onRun,
}: { mockId: string; mockSlug: string; ep: MockEndpoint; onRun: () => void }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<AdvSection>('response');
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [confirmAnchor, setConfirmAnchor] = useState<HTMLElement | null>(null);

  // Local editable copy of the endpoint while expanded.
  const [draft, setDraft] = useState<MockEndpoint>(ep);
  useEffect(() => { setDraft(ep); }, [ep.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    await updateEndpoint(mockId, ep.id, {
      responses: draft.responses,
      responseSelection: (draft as any).responseSelection,
      matchers: (draft as any).matchers,
      validation: (draft as any).validation,
      chaos: (draft as any).chaos,
      activeWindow: (draft as any).activeWindow,
    } as any);
    await qc.invalidateQueries({ queryKey: ['mock', mockId, 'endpoints'] });
    toast.success('Endpoint saved');
  };

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <div ref={rowRef} className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-hover/30">
        <Tooltip content={ep.enabled ? 'Disable endpoint' : 'Enable endpoint'}>
          <button
            data-testid={`ep-toggle-enabled-${ep.id}`}
            onClick={async () => {
              await toggleEndpoint(mockId, ep.id, !ep.enabled);
              await qc.invalidateQueries({ queryKey: ['mock', mockId, 'endpoints'] });
            }}
            className={cn('rounded p-1 transition-colors', ep.enabled ? 'text-success' : 'text-text-muted hover:text-text-primary')}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <MethodBadge method={ep.method} size="xs" />
        <Tooltip content={ep.pathPattern} side="bottom">
          <button
            onClick={() => setExpanded((x) => !x)}
            data-testid={`ep-row-${ep.id}`}
            className="min-w-0 flex-1 truncate text-left font-mono text-xs text-text-secondary"
          >
            {expanded ? <ChevronDown className="mr-1 inline h-3 w-3" /> : <ChevronRight className="mr-1 inline h-3 w-3" />}
            {ep.pathPattern}
          </button>
        </Tooltip>
        <StatusBadge status={ep.responses?.[0]?.statusCode ?? 200} />
        <Tooltip content="Open in Runner tab">
          <button
            data-testid={`ep-test-${ep.id}`}
            onClick={onRun}
            className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Hit URL in browser">
          <button
            data-testid={`ep-open-${ep.id}`}
            onClick={() => {
              const url = `${window.location.origin}/api/v1/mocks/${mockSlug}${ep.pathPattern.replace(/\{[^}]+\}/g, 'x')}`;
              window.open(url, '_blank');
            }}
            className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary"
          >
            <PlayCircle className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Delete endpoint">
          <button
            data-testid={`ep-del-${ep.id}`}
            onClick={() => setConfirmAnchor(rowRef.current)}
            className="rounded p-1 text-text-muted hover:bg-hover hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      {confirmAnchor && (
        <RowConfirm
          anchor={confirmAnchor}
          title="Delete endpoint?"
          description={`${ep.method} ${ep.pathPattern}`}
          onCancel={() => setConfirmAnchor(null)}
          onConfirm={async () => {
            await deleteEndpoint(mockId, ep.id);
            await qc.invalidateQueries({ queryKey: ['mock', mockId, 'endpoints'] });
            await qc.invalidateQueries({ queryKey: ['mocks'] });
            toast.success('Endpoint deleted');
            setConfirmAnchor(null);
          }}
        />
      )}

      {expanded && (
        <div className="border-t border-border/60 bg-probestack-bg/30" data-testid={`ep-adv-${ep.id}`}>
          {/* Sub-tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface/40 px-3">
            {([
              ['response',   'Response',    Layers],
              ['variants',   'Variants',    Layers],
              ['matchers',   'Matchers',    Filter],
              ['validation', 'Validation',  Shield],
              ['chaos',      'Chaos',       Zap],
              ['window',     'Active window', Clock],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                data-testid={`ep-adv-tab-${ep.id}-${key}`}
                onClick={() => setSection(key)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[11px] transition-colors',
                  section === key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-3">
            {section === 'response'   && <ResponseSection draft={draft} setDraft={setDraft} />}
            {section === 'variants'   && <VariantsSection draft={draft} setDraft={setDraft} />}
            {section === 'matchers'   && <MatchersSection draft={draft} setDraft={setDraft} />}
            {section === 'validation' && <ValidationSection draft={draft} setDraft={setDraft} />}
            {section === 'chaos'      && <ChaosSection draft={draft} setDraft={setDraft} />}
            {section === 'window'     && <WindowSection draft={draft} setDraft={setDraft} />}
          </div>
          <div className="flex justify-end border-t border-border/60 bg-surface/40 px-3 py-2">
            <Button variant="primary" data-testid={`ep-save-${ep.id}`} onClick={save}>
              <Check className="h-3.5 w-3.5" /> Save endpoint
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ───── Sub-section editors ────────────────────────────────────── */

type DraftProps = {
  draft: MockEndpoint;
  setDraft: (next: MockEndpoint) => void;
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{children}</div>
);

const ResponseSection = ({ draft, setDraft }: DraftProps) => {
  const v = draft.responses?.[0] ?? { statusCode: 200, body: '', bodyLanguage: 'json' };
  const update = (patch: Partial<typeof v>) => {
    const next = [...(draft.responses ?? [])];
    next[0] = { ...v, ...patch };
    setDraft({ ...draft, responses: next });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-[120px_1fr]" data-testid={`ep-section-response-${draft.id}`}>
      <div>
        <Label>Status code</Label>
        <input
          type="number"
          value={v.statusCode}
          onChange={(e) => update({ statusCode: parseInt(e.target.value) || 200 })}
          data-testid={`ep-status-${draft.id}`}
          className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
        />
        <div className="mt-3">
          <Label>Body language</Label>
          <select
            value={v.bodyLanguage ?? 'json'}
            onChange={(e) => update({ bodyLanguage: e.target.value as any })}
            data-testid={`ep-bodylang-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          >
            {['json','text','xml','html'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Response body</Label>
        <textarea
          value={v.body ?? ''}
          onChange={(e) => update({ body: e.target.value })}
          data-testid={`ep-body-${draft.id}`}
          className="h-40 w-full resize-none rounded border border-border bg-probestack-bg p-2 font-mono text-xs outline-none hover:border-primary/40 focus:border-primary"
        />
      </div>
    </div>
  );
};

const VariantsSection = ({ draft, setDraft }: DraftProps) => {
  const variants = draft.responses ?? [];
  const sel = (draft as any).responseSelection ?? 'FIRST_MATCH';
  const update = (patch: Partial<MockEndpoint>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-3" data-testid={`ep-section-variants-${draft.id}`}>
      <div className="flex items-center gap-3">
        <div>
          <Label>Selection strategy</Label>
          <select
            value={sel}
            onChange={(e) => update({ ...({ responseSelection: e.target.value } as any) })}
            data-testid={`ep-selection-${draft.id}`}
            className="h-8 w-44 rounded border border-border bg-probestack-bg px-2 text-xs"
          >
            <option value="FIRST_MATCH">First match (default)</option>
            <option value="RANDOM">Random</option>
            <option value="WEIGHTED">Weighted (uses weight)</option>
            <option value="SEQUENTIAL">Sequential / round-robin</option>
          </select>
        </div>
        <Button
          variant="outline"
          data-testid={`ep-add-variant-${draft.id}`}
          onClick={() => update({
            responses: [...variants, { statusCode: 200, body: '', bodyLanguage: 'json', name: `Variant ${variants.length + 1}`, weight: 1 } as any],
          })}
        >
          <Plus className="h-3.5 w-3.5" /> Add variant
        </Button>
      </div>
      {variants.length === 0 && <Empty text="No variants — add one to enable A/B/N or weighted responses." />}
      {variants.map((v, i) => (
        <div key={i} className="rounded-md border border-border bg-surface/40 p-3" data-testid={`ep-variant-${draft.id}-${i}`}>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_100px_32px]">
            <input
              value={(v as any).name ?? `Variant ${i+1}`}
              onChange={(e) => {
                const next = variants.slice(); (next[i] as any) = { ...v, name: e.target.value };
                update({ responses: next });
              }}
              data-testid={`ep-variant-name-${draft.id}-${i}`}
              className="h-7 rounded border border-border bg-probestack-bg px-2 text-[11px]"
              placeholder="Variant name"
            />
            <input
              type="number"
              value={v.statusCode}
              onChange={(e) => {
                const next = variants.slice(); next[i] = { ...v, statusCode: parseInt(e.target.value) || 200 };
                update({ responses: next });
              }}
              data-testid={`ep-variant-status-${draft.id}-${i}`}
              className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]"
              placeholder="Status"
            />
            <input
              type="number"
              value={(v as any).weight ?? 1}
              onChange={(e) => {
                const next = variants.slice(); (next[i] as any) = { ...v, weight: parseInt(e.target.value) || 1 };
                update({ responses: next });
              }}
              data-testid={`ep-variant-weight-${draft.id}-${i}`}
              className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]"
              placeholder="Weight"
            />
            <Tooltip content="Remove variant">
              <button
                onClick={() => update({ responses: variants.filter((_, j) => j !== i) })}
                data-testid={`ep-variant-remove-${draft.id}-${i}`}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Tooltip>
          </div>
          <textarea
            value={v.body ?? ''}
            onChange={(e) => {
              const next = variants.slice(); next[i] = { ...v, body: e.target.value };
              update({ responses: next });
            }}
            data-testid={`ep-variant-body-${draft.id}-${i}`}
            className="mt-2 h-24 w-full resize-none rounded border border-border bg-probestack-bg p-2 font-mono text-[11px] outline-none focus:border-primary"
          />
        </div>
      ))}
    </div>
  );
};

const MatchersSection = ({ draft, setDraft }: DraftProps) => {
  const m = (draft as any).matchers ?? { query: [], header: [], jsonPath: [], bodyContains: '' };
  const upd = (patch: any) => setDraft({ ...draft, ...({ matchers: { ...m, ...patch } } as any) });
  return (
    <div className="space-y-3" data-testid={`ep-section-matchers-${draft.id}`}>
      <p className="text-[11px] text-text-muted">Match the incoming request against query, headers, JSONPath assertions, or a literal body substring. Endpoint only fires if every matcher passes.</p>
      <KvList
        title="Query matchers"
        rows={m.query ?? []}
        onChange={(rows) => upd({ query: rows })}
        testId={`ep-match-query-${draft.id}`}
      />
      <KvList
        title="Header matchers"
        rows={m.header ?? []}
        onChange={(rows) => upd({ header: rows })}
        testId={`ep-match-header-${draft.id}`}
      />
      <KvList
        title="JSONPath asserts (e.g. $.user.id == 42)"
        rows={(m.jsonPath ?? []).map((j: any) => ({ key: j.path ?? '', value: j.equals ?? '' }))}
        onChange={(rows) => upd({ jsonPath: rows.map((r) => ({ path: r.key, equals: r.value })) })}
        testId={`ep-match-jsonpath-${draft.id}`}
        keyLabel="JSONPath" valueLabel="equals"
      />
      <div>
        <Label>Body contains (literal)</Label>
        <input
          value={m.bodyContains ?? ''}
          onChange={(e) => upd({ bodyContains: e.target.value })}
          data-testid={`ep-match-body-${draft.id}`}
          className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          placeholder="e.g. action=charge"
        />
      </div>
    </div>
  );
};

const ValidationSection = ({ draft, setDraft }: DraftProps) => {
  const v = (draft as any).validation ?? { requiredHeaders: [], requireContentTypeJson: false, jsonSchema: '' };
  const upd = (patch: any) => setDraft({ ...draft, ...({ validation: { ...v, ...patch } } as any) });
  return (
    <div className="space-y-3" data-testid={`ep-section-validation-${draft.id}`}>
      <p className="text-[11px] text-text-muted">Reject malformed requests with 4xx <strong>before</strong> the response is served. Treat your mock like a real upstream.</p>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!v.requireContentTypeJson}
          onChange={(e) => upd({ requireContentTypeJson: e.target.checked })}
          data-testid={`ep-val-ctjson-${draft.id}`}
          className="h-3 w-3 accent-[var(--color-primary)]"
        />
        <span className="text-[11px]">Require <code className="rounded bg-elevated px-1 font-mono">Content-Type: application/json</code> on body methods</span>
      </div>
      <div>
        <Label>Required header keys (one per line)</Label>
        <textarea
          value={(v.requiredHeaders ?? []).join('\n')}
          onChange={(e) => upd({ requiredHeaders: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          data-testid={`ep-val-headers-${draft.id}`}
          className="h-20 w-full resize-none rounded border border-border bg-probestack-bg p-2 font-mono text-[11px] outline-none focus:border-primary"
          placeholder={'Authorization\nX-Tenant'}
        />
      </div>
      <div>
        <Label>JSON Schema (optional)</Label>
        <textarea
          value={v.jsonSchema ?? ''}
          onChange={(e) => upd({ jsonSchema: e.target.value })}
          data-testid={`ep-val-schema-${draft.id}`}
          className="h-32 w-full resize-none rounded border border-border bg-probestack-bg p-2 font-mono text-[11px] outline-none focus:border-primary"
          placeholder='{"type": "object", "required": ["name"], "properties": {"name": {"type": "string"}}}'
        />
      </div>
    </div>
  );
};

const ChaosSection = ({ draft, setDraft }: DraftProps) => {
  const c = (draft as any).chaos ?? { errorRate: 0, errorStatus: 500, latencyMs: 0, latencyJitterMs: 0 };
  const upd = (patch: any) => setDraft({ ...draft, ...({ chaos: { ...c, ...patch } } as any) });
  return (
    <div className="space-y-3" data-testid={`ep-section-chaos-${draft.id}`}>
      <p className="text-[11px] text-text-muted">Inject realistic failure modes. Useful for testing retries, timeouts, and circuit-breakers in your client.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Error rate ({(c.errorRate * 100).toFixed(0)}%)</Label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={c.errorRate ?? 0}
            onChange={(e) => upd({ errorRate: parseFloat(e.target.value) })}
            data-testid={`ep-chaos-rate-${draft.id}`}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>
        <div>
          <Label>Error status</Label>
          <input
            type="number"
            value={c.errorStatus ?? 500}
            onChange={(e) => upd({ errorStatus: parseInt(e.target.value) || 500 })}
            data-testid={`ep-chaos-status-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </div>
        <div>
          <Label>Latency (ms)</Label>
          <input
            type="number" min={0}
            value={c.latencyMs ?? 0}
            onChange={(e) => upd({ latencyMs: parseInt(e.target.value) || 0 })}
            data-testid={`ep-chaos-latency-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </div>
        <div>
          <Label>Latency jitter ± (ms)</Label>
          <input
            type="number" min={0}
            value={c.latencyJitterMs ?? 0}
            onChange={(e) => upd({ latencyJitterMs: parseInt(e.target.value) || 0 })}
            data-testid={`ep-chaos-jitter-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
};

const WindowSection = ({ draft, setDraft }: DraftProps) => {
  const w = (draft as any).activeWindow ?? { startsAt: '', endsAt: '' };
  const upd = (patch: any) => setDraft({ ...draft, ...({ activeWindow: { ...w, ...patch } } as any) });
  return (
    <div className="space-y-3" data-testid={`ep-section-window-${draft.id}`}>
      <p className="text-[11px] text-text-muted">Endpoint is only active during this window. Use to schedule maintenance windows or A/B rollouts.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Starts at (ISO)</Label>
          <input
            type="datetime-local"
            value={w.startsAt ?? ''}
            onChange={(e) => upd({ startsAt: e.target.value })}
            data-testid={`ep-window-start-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </div>
        <div>
          <Label>Ends at (ISO)</Label>
          <input
            type="datetime-local"
            value={w.endsAt ?? ''}
            onChange={(e) => upd({ endsAt: e.target.value })}
            data-testid={`ep-window-end-${draft.id}`}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
};

const KvList = ({
  title, rows, onChange, testId, keyLabel = 'Key', valueLabel = 'Value',
}: {
  title: string;
  rows: { key: string; value: string }[];
  onChange: (rows: { key: string; value: string }[]) => void;
  testId: string;
  keyLabel?: string; valueLabel?: string;
}) => (
  <div data-testid={testId}>
    <div className="mb-1 flex items-center justify-between">
      <Label>{title}</Label>
      <button
        onClick={() => onChange([...rows, { key: '', value: '' }])}
        data-testid={`${testId}-add`}
        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        <Plus className="h-2.5 w-2.5" /> Add
      </button>
    </div>
    {rows.length === 0 && <Empty text={`No ${title.toLowerCase()}.`} />}
    {rows.map((r, i) => (
      <div key={i} className="mb-1 grid grid-cols-[1fr_1fr_24px] gap-1.5">
        <input
          value={r.key}
          onChange={(e) => onChange(rows.map((row, j) => j === i ? { ...row, key: e.target.value } : row))}
          placeholder={keyLabel}
          data-testid={`${testId}-key-${i}`}
          className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]"
        />
        <input
          value={r.value}
          onChange={(e) => onChange(rows.map((row, j) => j === i ? { ...row, value: e.target.value } : row))}
          placeholder={valueLabel}
          data-testid={`${testId}-val-${i}`}
          className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]"
        />
        <button
          onClick={() => onChange(rows.filter((_, j) => j !== i))}
          data-testid={`${testId}-rm-${i}`}
          className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    ))}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-md border border-dashed border-border bg-probestack-bg/40 px-3 py-2 text-[11px] text-text-muted">{text}</div>
);
