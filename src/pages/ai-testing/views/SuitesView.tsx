/**
 * SuitesView — main detail surface for a selected suite.
 *
 * ?new=1            → show the "Create suite" form
 * ?suite=<id>       → show the suite detail (cases + run controls)
 * (neither)         → show all suites overview with cards
 *
 * Compared to the old SuitesTab, this view:
 *   • removed the duplicate left "Suites" column (now lives in
 *     ContextSidebar via AiTestingPanel)
 *   • added "Duplicate suite" + chat/agent/tool-calling suite-type
 *     authoring + assertion type list reflects backend catalog
 *   • the "Run" button supports sequential AND parallel modes
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ListChecks, Loader2, Play, Trash2, Save, Sliders, Copy, ChevronRight, Plus,
} from 'lucide-react';
import {
  fetchCatalog, listSuites,
  createSuite, getSuite, deleteSuite, duplicateSuite,
  listCases, createCase, deleteCase,
  triggerRun,
  type Catalog, type TestSuite, type TestCase, type Assertion,
} from '@/services/aiTesting.service';
import { cn } from '@/utils/cn';

export const SuitesView = ({ workspaceId }: { workspaceId: string }) => {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const isNew = params.get('new') === '1';
  const suiteId = params.get('suite');

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => { fetchCatalog(workspaceId).then(setCatalog).catch(() => {}); }, [workspaceId]);

  if (isNew) return <NewSuiteForm workspaceId={workspaceId} catalog={catalog}
                                  onCreated={(s) => setParams({ view: 'suites', suite: s.id! }, { replace: true })}
                                  onCancel={() => setParams({ view: 'suites' }, { replace: true })} />;
  if (suiteId) return <SuiteDetail workspaceId={workspaceId} suiteId={suiteId} catalog={catalog} />;
  return <SuitesIndex workspaceId={workspaceId} />;
};

/* ─── INDEX (no suite selected) ──────────────────────────────────────── */
const SuitesIndex = ({ workspaceId }: { workspaceId: string }) => {
  const [items, setItems] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setParams] = useSearchParams();
  useEffect(() => {
    setLoading(true);
    listSuites(workspaceId)
      .then((d) => setItems(d?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="p-6" data-testid="ai-testing-suites-index">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Test suites</h2>
          <p className="text-xs text-text-muted">Groups of cases sharing a provider + system prompt.</p>
        </div>
        <button type="button" onClick={() => setParams({ view: 'suites', new: '1' })}
                data-testid="ai-testing-create-suite-cta"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90">
          <Plus className="h-3 w-3" /> New suite
        </button>
      </div>
      {loading ? (
        <div className="mt-10 grid place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center text-[12px] text-text-muted">
          <ListChecks className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No suites yet — click <strong className="text-text-primary">New suite</strong> to start.
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((s) => (
            <li key={s.id}
                className="cursor-pointer rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40"
                onClick={() => setParams({ view: 'suites', suite: s.id! })}
                data-testid={`ai-testing-index-suite-${s.id}`}>
              <div className="flex items-center justify-between">
                <div className="truncate text-sm font-semibold">{s.name}</div>
                <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
              </div>
              <div className="mt-0.5 text-[11px] text-text-muted">
                {s.suiteType} · {s.provider}/{s.model}
              </div>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">{s.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─── DETAIL ─────────────────────────────────────────────────────────── */
const SuiteDetail = ({ workspaceId, suiteId, catalog }: { workspaceId: string; suiteId: string; catalog: Catalog | null }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [busy, setBusy] = useState<'load' | 'run' | 'dup' | null>('load');

  useEffect(() => {
    setBusy('load');
    Promise.all([getSuite(workspaceId, suiteId), listCases(workspaceId, suiteId)])
      .then(([s, c]) => { setSuite(s); setCases(c ?? []); })
      .catch((e) => toast.error('Could not load suite', { description: e?.message ?? '' }))
      .finally(() => setBusy(null));
  }, [workspaceId, suiteId]);

  const handleRun = async (mode: 'sequential' | 'parallel') => {
    setBusy('run');
    try {
      const r = await triggerRun(workspaceId, { suiteId, mode, parallelism: mode === 'parallel' ? 4 : 1 });
      toast.success(`Run queued (${mode})`, { description: 'Opening run detail…' });
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      nav(`/projects/ai-testing?view=runs&run=${r.id}`);
    } catch (e: any) { toast.error('Could not trigger run', { description: e?.message ?? '' }); }
    finally { setBusy(null); }
  };

  const handleDuplicate = async () => {
    setBusy('dup');
    try {
      const copy = await duplicateSuite(workspaceId, suiteId);
      toast.success('Suite duplicated');
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      nav(`/projects/ai-testing?view=suites&suite=${copy.id}`);
    } catch (e: any) { toast.error('Failed', { description: e?.message ?? '' }); }
    finally { setBusy(null); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this suite (soft delete)?')) return;
    try {
      await deleteSuite(workspaceId, suiteId);
      toast.success('Suite deleted');
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      setParams({ view: 'suites' }, { replace: true });
    } catch (e: any) { toast.error('Failed', { description: e?.message ?? '' }); }
  };

  const handleAddCase = async (body: TestCase) => {
    try {
      const c = await createCase(workspaceId, suiteId, body);
      setCases((p) => [...p, c]);
      toast.success('Case added');
    } catch (e: any) { toast.error('Failed', { description: e?.message ?? '' }); }
  };

  const handleDeleteCase = async (id: string) => {
    if (!confirm('Delete this case?')) return;
    const prev = cases;
    setCases((p) => p.filter((c) => c.id !== id));
    try { await deleteCase(workspaceId, suiteId, id); toast.success('Case deleted'); }
    catch (e: any) { setCases(prev); toast.error('Failed', { description: e?.message ?? '' }); }
  };

  if (busy === 'load' || !suite) {
    return <div className="grid h-full place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="p-6" data-testid="ai-testing-suite-detail">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{suite.name}</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {suite.suiteType} · {suite.provider}/{suite.model} · {cases.length} case(s)
            {suite.createdByEmail && <> · by {suite.createdByEmail}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleRun('sequential')} disabled={!!busy || cases.length === 0}
                  data-testid="ai-testing-run-sequential"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy === 'run' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Run
          </button>
          <button type="button" onClick={() => handleRun('parallel')} disabled={!!busy || cases.length === 0}
                  data-testid="ai-testing-run-parallel"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50">
            <Sliders className="h-3 w-3" /> Run ×4 (parallel)
          </button>
          <button type="button" onClick={handleDuplicate} disabled={!!busy}
                  data-testid="ai-testing-duplicate-suite"
                  className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:bg-elevated">
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" onClick={handleDelete}
                  className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {suite.description && (
        <p className="mt-2 text-[12px] text-text-secondary">{suite.description}</p>
      )}
      {suite.systemPrompt && (
        <details className="mt-2 rounded-md border border-border bg-elevated/40 p-2 text-[11px]" open>
          <summary className="cursor-pointer font-semibold">System prompt</summary>
          <pre className="mt-1 whitespace-pre-wrap text-text-secondary">{suite.systemPrompt}</pre>
        </details>
      )}

      <h3 className="mt-5 mb-2 text-sm font-semibold">Test cases</h3>
      <CaseAdder catalog={catalog} suiteType={suite.suiteType as any} onAdd={handleAddCase} />
      <ul className="mt-3 divide-y divide-border/40 rounded-md border border-border bg-surface">
        {cases.length === 0 ? (
          <li className="px-4 py-6 text-center text-[11px] text-text-muted">
            No cases yet — add the first one above.
          </li>
        ) : cases.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-2"
              data-testid={`ai-testing-case-${c.id}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium">{c.name}</div>
              <div className="truncate text-[11px] text-text-secondary">{c.input || (c.messages ? '[chat thread]' : '')}</div>
              {c.assertions && c.assertions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.assertions.map((a, i) => (
                    <span key={i} className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                      {a.type}{a.value && `: "${a.value}"`}{a.max !== undefined && `: ≤${a.max}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => handleDeleteCase(c.id!)}
                    className="grid h-6 w-6 place-items-center rounded text-danger hover:bg-danger/10">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ─── NEW SUITE FORM ─────────────────────────────────────────────────── */
const NewSuiteForm = ({ workspaceId, catalog, onCreated, onCancel }: {
  workspaceId: string; catalog: Catalog | null; onCreated: (s: TestSuite) => void; onCancel: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [suiteType, setSuiteType] = useState<any>('prompt');
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Reply briefly.');
  const [temperature, setTemperature] = useState(0.0);
  const [maxTokens, setMaxTokens] = useState(200);
  const [busy, setBusy] = useState(false);

  const models = useMemo(() => catalog?.providers.find((p) => p.id === provider)?.models ?? [], [catalog, provider]);
  useEffect(() => { if (models.length && !models.includes(model)) setModel(models[0]); }, [provider, models]); // eslint-disable-line

  const submit = async () => {
    setBusy(true);
    try {
      const s = await createSuite(workspaceId, { name, description, suiteType, provider, model, systemPrompt, temperature, maxTokens });
      toast.success('Suite created');
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      onCreated(s);
    } catch (e: any) { toast.error('Failed', { description: e?.message ?? '' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl p-6" data-testid="ai-testing-new-suite-form">
      <h2 className="text-base font-semibold">New test suite</h2>
      <p className="mb-4 text-[11px] text-text-muted">Group of cases sharing a provider/model + system prompt.</p>
      <div className="grid gap-3">
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
              {(catalog?.suiteTypes ?? ['prompt','chat','agent','rag','tool_calling','safety']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}
                    data-testid="ai-testing-new-suite-provider">
              {(catalog?.providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
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
          <button type="button" disabled={busy || !name.trim()} onClick={submit}
                  data-testid="ai-testing-new-suite-submit"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
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

/* ─── CASE ADDER ─────────────────────────────────────────────────────── */
const CaseAdder = ({ catalog, suiteType, onAdd }: {
  catalog: Catalog | null; suiteType?: string; onAdd: (c: TestCase) => void;
}) => {
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  const [assertions, setAssertions] = useState<Assertion[]>([{ type: 'contains', value: '' }]);

  const addA = () => setAssertions((p) => [...p, { type: 'contains', value: '' }]);
  const setA = (i: number, a: Partial<Assertion>) =>
    setAssertions((p) => p.map((x, idx) => (idx === i ? { ...x, ...a } : x)));
  const rmA  = (i: number) => setAssertions((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-md border border-dashed border-border bg-elevated/30 p-3"
         data-testid="ai-testing-case-adder">
      <div className="grid gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
               placeholder="Case name (e.g. 'Sick leave policy')" data-testid="ai-testing-case-name" />
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} className={inputCls}
                  placeholder={suiteType === 'chat' ? 'First user message in the conversation' : 'User input / prompt'}
                  data-testid="ai-testing-case-input" />
        <div className="text-[11px] font-semibold text-text-muted">Assertions</div>
        {assertions.map((a, i) => (
          <div key={i} className="flex gap-2">
            <select value={a.type} onChange={(e) => setA(i, { type: e.target.value })} className={cn(inputCls, 'w-44')}>
              {(catalog?.assertions ?? [
                { id: 'contains', label: 'Contains' },
                { id: 'not_contains', label: 'Not contains' },
                { id: 'regex', label: 'Regex' },
                { id: 'latency_ms', label: 'Latency budget' },
                { id: 'cost_usd', label: 'Cost budget' },
              ]).map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
            {['latency_ms','cost_usd'].includes(a.type) ? (
              <input type="number" step="any" value={a.max ?? ''} onChange={(e) => setA(i, { max: parseFloat(e.target.value) })}
                     className={cn(inputCls, 'flex-1')} placeholder="max" />
            ) : (
              <input value={a.value ?? a.pattern ?? ''} onChange={(e) => {
                if (a.type === 'regex') setA(i, { pattern: e.target.value });
                else setA(i, { value: e.target.value });
              }} className={cn(inputCls, 'flex-1')} placeholder={a.type === 'regex' ? 'pattern' : 'value'} />
            )}
            <button type="button" onClick={() => rmA(i)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-border text-danger hover:bg-danger/10">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={addA}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] hover:bg-elevated">
            + Add assertion
          </button>
          <button type="button"
                  disabled={!name.trim() || !input.trim()}
                  onClick={() => {
                    onAdd({ name, input, assertions });
                    setName(''); setInput(''); setAssertions([{ type: 'contains', value: '' }]);
                  }}
                  data-testid="ai-testing-case-submit"
                  className="ml-auto rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
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
