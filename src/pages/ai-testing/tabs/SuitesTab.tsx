/**
 * Suites tab — list + create + drill into cases + trigger run.
 *
 * Two-pane: left list, right detail. Optimistic updates everywhere.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, ListChecks, Loader2, Play, Trash2, Save, ChevronRight, Settings2, Sliders,
} from 'lucide-react';
import {
  listSuites, createSuite, deleteSuite,
  listCases, createCase, deleteCase, updateCase,
  triggerRun, fetchCatalog,
  type TestSuite, type TestCase, type Catalog, type Assertion,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

export const SuitesTab = ({ workspaceId }: { workspaceId: string }) => {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [active, setActive] = useState<TestSuite | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchCatalog(workspaceId).then(setCatalog).catch(() => {}); }, [workspaceId]);

  const reload = async () => {
    setLoading(true);
    try {
      const d = await listSuites(workspaceId);
      setSuites(d?.items ?? []);
      if (!active && (d?.items ?? []).length) setActive(d.items[0]);
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [workspaceId]);

  useEffect(() => {
    if (!active?.id) { setCases([]); return; }
    listCases(workspaceId, active.id).then(setCases).catch(() => setCases([]));
  }, [active?.id, workspaceId]);

  const handleCreate = async (body: TestSuite) => {
    setCreating(true);
    try {
      const s = await createSuite(workspaceId, body);
      setSuites((p) => [s, ...p]);
      setActive(s);
      setShowNew(false);
      toast.success('Suite created');
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this suite (soft delete)?')) return;
    const prev = suites;
    setSuites((p) => p.filter((s) => s.id !== id));
    if (active?.id === id) setActive(suites.find((s) => s.id !== id) ?? null);
    try { await deleteSuite(workspaceId, id); toast.success('Suite deleted'); }
    catch (e: any) { setSuites(prev); toast.error('Failed', { description: e?.message ?? '' }); }
  };

  const handleRun = async (suiteId: string, mode: 'sequential' | 'parallel') => {
    setRunningId(suiteId);
    try {
      const r = await triggerRun(workspaceId, { suiteId, mode, parallelism: mode === 'parallel' ? 4 : 1 });
      toast.success(`Run queued (${mode})`, { description: `runId=${r.id.slice(0, 8)}` });
    } catch (e: any) {
      toast.error('Failed to trigger run', { description: e?.message ?? '' });
    } finally { setRunningId(null); }
  };

  const handleAddCase = async (body: TestCase) => {
    if (!active?.id) return;
    try {
      const c = await createCase(workspaceId, active.id, body);
      setCases((p) => [...p, c]);
      toast.success('Case added');
    } catch (e: any) { toast.error('Failed', { description: e?.message ?? '' }); }
  };

  const handleDeleteCase = async (id: string) => {
    if (!active?.id) return;
    if (!confirm('Delete this case?')) return;
    const prev = cases;
    setCases((p) => p.filter((c) => c.id !== id));
    try { await deleteCase(workspaceId, active.id, id); toast.success('Case deleted'); }
    catch (e: any) { setCases(prev); toast.error('Failed', { description: e?.message ?? '' }); }
  };

  return (
    <div className="flex h-full">
      {/* Suites column */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface" data-testid="ai-testing-suite-list">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Suites</div>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            data-testid="ai-testing-suite-new"
            className="grid h-6 w-6 place-items-center rounded-md text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {loading ? (
          <div className="grid flex-1 place-items-center text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : suites.length === 0 ? (
          <div className="grid flex-1 place-items-center p-4 text-center text-[11px] text-text-muted">
            <ListChecks className="mx-auto mb-1 h-6 w-6 opacity-50" />
            No suites yet. Click + to create one.
          </div>
        ) : (
          <ul className="overflow-auto">
            {suites.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s)}
                  data-testid={`ai-testing-suite-row-${s.id}`}
                  className={cn(
                    'group flex w-full items-start gap-2 px-3 py-2 text-left transition-colors',
                    active?.id === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-hover',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{s.name}</div>
                    <div className="truncate text-[10px] text-text-muted">
                      {s.provider} · {s.model}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail */}
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {showNew ? (
          <NewSuiteForm
            catalog={catalog}
            onCancel={() => setShowNew(false)}
            onCreate={handleCreate}
            busy={creating}
          />
        ) : !active ? (
          <div className="grid flex-1 place-items-center text-text-muted text-sm">
            Select a suite or create a new one.
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{active.name}</h2>
                <p className="text-[11px] text-text-muted">
                  {active.suiteType} · {active.provider}/{active.model} · {cases.length} cases
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRun(active.id!, 'sequential')}
                  disabled={runningId === active.id || cases.length === 0}
                  data-testid="ai-testing-run-sequential"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {runningId === active.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Run (sequential)
                </button>
                <button
                  type="button"
                  onClick={() => handleRun(active.id!, 'parallel')}
                  disabled={runningId === active.id || cases.length === 0}
                  data-testid="ai-testing-run-parallel"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  <Sliders className="h-3 w-3" /> Run (parallel ×4)
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(active.id!)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {active.description && (
              <p className="mt-2 text-[12px] text-text-secondary">{active.description}</p>
            )}
            {active.systemPrompt && (
              <details className="mt-2 rounded-md border border-border bg-elevated/40 p-2 text-[11px]">
                <summary className="cursor-pointer font-semibold">System prompt</summary>
                <pre className="mt-1 whitespace-pre-wrap text-text-secondary">{active.systemPrompt}</pre>
              </details>
            )}

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Test cases</div>
              </div>
              <CaseAdder catalog={catalog} onAdd={handleAddCase} />
              <ul className="mt-3 divide-y divide-border/40 rounded-md border border-border bg-surface">
                {cases.length === 0 ? (
                  <li className="px-4 py-6 text-center text-[11px] text-text-muted">
                    No cases yet — add the first one above.
                  </li>
                ) : cases.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-2" data-testid={`ai-testing-case-${c.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{c.name}</div>
                      <div className="truncate text-[11px] text-text-secondary">{c.input}</div>
                      {c.assertions && c.assertions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.assertions.map((a, i) => (
                            <span key={i} className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                              {a.type}
                              {a.value && `: "${a.value}"`}
                              {a.max !== undefined && `: ≤${a.max}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCase(c.id!)}
                      className="grid h-6 w-6 place-items-center rounded text-danger hover:bg-danger/10"
                      data-testid={`ai-testing-case-delete-${c.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NewSuiteForm = ({ catalog, onCancel, onCreate, busy }: {
  catalog: Catalog | null;
  onCancel: () => void;
  onCreate: (b: TestSuite) => void;
  busy: boolean;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [suiteType, setSuiteType] = useState<any>('prompt');
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Reply briefly.');
  const [temperature, setTemperature] = useState(0.0);
  const [maxTokens, setMaxTokens] = useState(200);

  const models = useMemo(
    () => catalog?.providers.find((p) => p.id === provider)?.models ?? [],
    [catalog, provider],
  );

  return (
    <div className="p-6">
      <h2 className="text-base font-semibold">New test suite</h2>
      <p className="mb-4 text-[11px] text-text-muted">Group of cases sharing a provider/model + system prompt.</p>
      <div className="grid max-w-2xl gap-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
                 placeholder="e.g. HR Buddy smoke" data-testid="ai-testing-new-suite-name" />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls}
                 placeholder="optional" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Suite type">
            <select value={suiteType} onChange={(e) => setSuiteType(e.target.value)} className={inputCls}>
              {(catalog?.suiteTypes ?? ['prompt']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}
                    data-testid="ai-testing-new-suite-provider">
              {(catalog?.providers ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}
                    data-testid="ai-testing-new-suite-model">
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label="System prompt">
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
                    className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Temperature">
            <input type="number" step={0.1} min={0} max={2} value={temperature}
                   onChange={(e) => setTemperature(parseFloat(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Max tokens">
            <input type="number" min={1} max={4096} value={maxTokens}
                   onChange={(e) => setMaxTokens(parseInt(e.target.value || '0'))} className={inputCls} />
          </Field>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => onCreate({ name, description, suiteType, provider, model, systemPrompt, temperature, maxTokens })}
            data-testid="ai-testing-new-suite-submit"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Create suite
          </button>
          <button type="button" onClick={onCancel}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const CaseAdder = ({ catalog, onAdd }: { catalog: Catalog | null; onAdd: (c: TestCase) => void }) => {
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  const [assertions, setAssertions] = useState<Assertion[]>([{ type: 'contains', value: '' }]);

  const addAssert = () => setAssertions((p) => [...p, { type: 'contains', value: '' }]);
  const setAssert = (i: number, a: Partial<Assertion>) =>
    setAssertions((p) => p.map((x, idx) => (idx === i ? { ...x, ...a } : x)));
  const removeAssert = (i: number) => setAssertions((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-md border border-dashed border-border bg-elevated/30 p-3" data-testid="ai-testing-case-adder">
      <div className="grid gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
               placeholder="Case name (e.g. 'Sick leave policy')" data-testid="ai-testing-case-name" />
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} className={inputCls}
                  placeholder="User input / prompt" data-testid="ai-testing-case-input" />
        <div className="text-[11px] font-semibold text-text-muted">Assertions</div>
        {assertions.map((a, i) => (
          <div key={i} className="flex gap-2">
            <select value={a.type} onChange={(e) => setAssert(i, { type: e.target.value })}
                    className={cn(inputCls, 'w-44')}>
              {(catalog?.assertions ?? [
                { id: 'contains', label: 'Contains' },
                { id: 'not_contains', label: 'Not contains' },
                { id: 'regex', label: 'Regex' },
                { id: 'latency_ms', label: 'Latency budget' },
                { id: 'cost_usd', label: 'Cost budget' },
              ]).map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            {['latency_ms','cost_usd'].includes(a.type) ? (
              <input type="number" step="any" value={a.max ?? ''} onChange={(e) => setAssert(i, { max: parseFloat(e.target.value) })}
                     className={cn(inputCls, 'flex-1')} placeholder="max" />
            ) : (
              <input value={a.value ?? a.pattern ?? ''} onChange={(e) => {
                if (a.type === 'regex') setAssert(i, { pattern: e.target.value });
                else setAssert(i, { value: e.target.value });
              }} className={cn(inputCls, 'flex-1')} placeholder={a.type === 'regex' ? 'pattern' : 'value'} />
            )}
            <button type="button" onClick={() => removeAssert(i)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={addAssert}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] hover:bg-elevated">
            + Add assertion
          </button>
          <button
            type="button"
            disabled={!name.trim() || !input.trim()}
            onClick={() => {
              onAdd({ name, input, assertions });
              setName(''); setInput(''); setAssertions([{ type: 'contains', value: '' }]);
            }}
            data-testid="ai-testing-case-submit"
            className="ml-auto rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Add case
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: any) => (
  <div>
    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);

const inputCls =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary';
