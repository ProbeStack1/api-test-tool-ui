/**
 * QuickTestView — one-shot LLM call without persisting a suite.
 * Now shows: result text + tool-call rendering + per-call cost &
 * latency, plus a "Promote to suite" CTA so a successful probe can be
 * persisted as a full test case.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Zap, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  fetchCatalog, quickTest, createSuite, createCase,
  type Catalog, type QuickTestResult,
} from '@/services/aiTesting.service';
import { ExecutionTrace } from './ExecutionTrace';

export const QuickTestView = ({ workspaceId }: { workspaceId: string }) => {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant. Reply briefly.');
  const [input, setInput] = useState('Hi! Tell me one fun fact about dolphins.');
  const [temperature, setTemperature] = useState(0.0);
  const [maxTokens, setMaxTokens] = useState(200);
  const [resp, setResp] = useState<QuickTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingSuite, setSavingSuite] = useState(false);

  useEffect(() => { fetchCatalog(workspaceId).then(setCatalog).catch(() => {}); }, [workspaceId]);
  useEffect(() => {
    const ms = catalog?.providers.find((p) => p.id === provider)?.models ?? [];
    if (ms.length && !ms.includes(model)) setModel(ms[0]);
  }, [provider, catalog]); // eslint-disable-line

  const models = useMemo(
    () => catalog?.providers.find((p) => p.id === provider)?.models ?? [],
    [catalog, provider],
  );

  const run = async () => {
    setBusy(true); setResp(null);
    try {
      const r = await quickTest(workspaceId, { provider, model, systemPrompt, input, temperature, maxTokens });
      setResp(r);
      if (r?.error) toast.error('Provider error', { description: r.error });
    } catch (e: any) {
      toast.error('Failed', { description: e?.message ?? '' });
    } finally { setBusy(false); }
  };

  const promote = async () => {
    if (!resp || resp.error) return;
    setSavingSuite(true);
    try {
      const s = await createSuite(workspaceId, {
        name: `Quick — ${new Date().toLocaleString()}`,
        description: 'Promoted from a quick test',
        suiteType: 'prompt',
        provider, model, systemPrompt, temperature, maxTokens,
      });
      await createCase(workspaceId, s.id!, {
        name: 'Promoted case',
        input,
        assertions: [
          { type: 'latency_ms', max: 30000 },
          { type: 'cost_usd', max: 0.05 },
        ],
      });
      toast.success('Suite created from quick test', { description: 'Open in Suites to add more cases.' });
      window.dispatchEvent(new CustomEvent('forgeq:ai-testing:refresh'));
      nav(`/projects/ai-testing?view=suites&suite=${s.id}`);
    } catch (e: any) {
      toast.error('Failed to promote', { description: e?.message ?? '' });
    } finally { setSavingSuite(false); }
  };

  return (
    <div className="p-6" data-testid="ai-testing-quick-view">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Quick test</h2>
      </div>
      <p className="mb-5 text-[11px] text-text-muted">
        One-shot LLM call — useful to validate a prompt before turning it into a suite.
      </p>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}
                    data-testid="ai-testing-quick-provider">
              {(catalog?.providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}
                    data-testid="ai-testing-quick-model">
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="System prompt">
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={2}
                      className={inputCls} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="User input">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} className={inputCls}
                      data-testid="ai-testing-quick-input" />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Field label="Temperature">
            <input type="number" step={0.1} min={0} max={2} value={temperature}
                   onChange={(e) => setTemperature(parseFloat(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Max tokens">
            <input type="number" min={1} max={4096} value={maxTokens}
                   onChange={(e) => setMaxTokens(parseInt(e.target.value || '0'))} className={inputCls} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !input.trim()} onClick={run}
                  data-testid="ai-testing-quick-run"
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            {busy ? 'Calling…' : 'Run test'}
          </button>
          {resp && !resp.error && (
            <button type="button" disabled={savingSuite} onClick={promote}
                    data-testid="ai-testing-quick-promote"
                    className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50">
              {savingSuite ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Promote to suite
            </button>
          )}
        </div>
      </div>

      {resp && (
        <div className="mt-5 rounded-lg border border-border bg-surface p-4" data-testid="ai-testing-quick-result">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Result</div>
            <div className="flex gap-3 text-[10px] text-text-muted">
              <span>{resp.tokensPrompt ?? 0} + {resp.tokensCompletion ?? 0} tokens</span>
              <span>${(resp.costUsd ?? 0).toFixed(6)}</span>
              <span>{resp.latencyMs ?? 0} ms</span>
              {resp.finishReason && <span>finish: {resp.finishReason}</span>}
            </div>
          </div>
          {resp.error ? (
            <div className="flex items-start gap-2 rounded bg-danger/10 p-3 text-[12px] text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <pre className="whitespace-pre-wrap">{resp.error}</pre>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded bg-elevated/40 p-3 text-[12px] text-text-primary">
              {resp.text || '(empty response)'}
            </pre>
          )}
          {resp.toolCalls && resp.toolCalls.length > 0 && (
            <details className="mt-2 rounded border border-border bg-elevated/40 p-2 text-[11px]">
              <summary className="cursor-pointer font-semibold">{resp.toolCalls.length} tool call(s)</summary>
              <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(resp.toolCalls, null, 2)}</pre>
            </details>
          )}

          {/* ─── Step-by-step Execution Trace (Postman-style) ─── */}
          <div className="mt-3">
            <ExecutionTrace result={resp} />
          </div>
        </div>
      )}
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
