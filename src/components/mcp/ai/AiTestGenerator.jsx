// src/components/mcp/ai/AiTestGenerator.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Sparkles, Wand2, Wrench, RefreshCw, Copy, Check, Zap } from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import { LoadingBlock } from '../shared/Spinner';
import { Button, Field, TextInput } from '../shared/Field';
import JsonViewer from '../shared/JsonViewer';
import ServerSelector from '../shared/ServerSelector';
import StatusBadge from '../shared/StatusBadge';
import {
  buildServerRef, mcpListTools, mcpAiStatus, mcpAiGenerateTests,
} from '../../../services/mcpService';

export default function AiTestGenerator({ servers, activeId, setActiveId, workspaceId, onManageServers }) {
  const activeServer = servers.find(s => (s.id || s.serverId) === activeId);
  const serverRef = useMemo(() => buildServerRef({
    serverId: activeId, workspaceId,
    serverUrl: activeServer?.serverUrl, transport: activeServer?.transport,
    authHeaders: activeServer?.authHeaders,
  }), [activeId, workspaceId, activeServer]);

  const [aiStatus, setAiStatus]   = useState(null);
  const [tools, setTools]         = useState([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [count, setCount]         = useState(6);
  const [notes, setNotes]         = useState('');
  const [generating, setGenerating] = useState(false);
  const [tests, setTests]         = useState(null);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    (async () => {
      try { const { data } = await mcpAiStatus(); setAiStatus(data); }
      catch { setAiStatus({ ready: false }); }
    })();
  }, []);

  const loadTools = useCallback(async () => {
    if (!activeId) return;
    setLoadingTools(true);
    try {
      const { data } = await mcpListTools(serverRef);
      const list = data?.tools || data?.items || [];
      setTools(list);
      setSelectedTool(prev => prev && list.find(t => t.name === prev.name) ? prev : list[0] || null);
    } catch { toast.error('Failed to load tools'); }
    finally { setLoadingTools(false); }
  }, [activeId, serverRef]);

  useEffect(() => { loadTools(); }, [loadTools]);

  const handleGenerate = async () => {
    if (!selectedTool) return;
    setGenerating(true); setTests(null);
    let toastId;
    try {
      toastId = toast.loading('Contacting AI… trying primary model', { duration: Infinity });
      // Reassure the user if Gemini is slow — shift the message every few seconds
      // so it feels like the system is actively retrying instead of hanging.
      const phases = [
        'Primary model busy — falling back to gemini-2.0-flash…',
        'Still busy — trying gemini-1.5-flash…',
        'Trying lighter gemini-1.5-flash-8b…',
        'Last resort — gemini-1.5-pro…',
      ];
      let phaseIdx = 0;
      const phaseTimer = setInterval(() => {
        if (phaseIdx >= phases.length) return;
        toast.loading(phases[phaseIdx++], { id: toastId });
      }, 3500);

      try {
        const { data } = await mcpAiGenerateTests({
          ...serverRef,
          tool_name: selectedTool.name,
          input_schema: selectedTool.inputSchema || selectedTool.input_schema || null,
          description: selectedTool.description || null,
          test_count: Number(count) || 5,
          notes: notes || null,
        });
        setTests(data);
        const n = (Array.isArray(data) ? data : (data?.testCases || data?.tests || [])).length;
        toast.success(n ? `Generated ${n} test case${n === 1 ? '' : 's'}` : 'AI returned an empty suite', { id: toastId });
      } finally {
        clearInterval(phaseTimer);
      }
    } catch (err) {
      const backendMsg = err.response?.data?.message;
      const status = err.response?.status;
      // Backend returns 503 with a friendly reason for AI overloads.
      // For anything else we fall back to a generic but still-useful copy.
      let final;
      if (backendMsg && status === 503) {
        final = backendMsg; // already user-friendly
      } else if (backendMsg && (status === 400 || status === 404)) {
        final = backendMsg;
      } else if (/network|fetch|cors/i.test(err.message || '')) {
        final = 'Cannot reach the backend. Is the server running?';
      } else {
        final = backendMsg
          ? backendMsg
          : 'AI service is busy right now. Please retry in a few seconds.';
      }
      toast.error(final, { id: toastId, duration: 7000 });
    } finally { setGenerating(false); }
  };

  const handleCopy = async () => {
    if (!tests) return;
    await navigator.clipboard.writeText(JSON.stringify(tests, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1200);
    toast.success('Copied');
  };

  if (!activeId) {
    return (
      <Card><CardBody>
        <EmptyState
          icon={Sparkles}
          title="Select a server to generate tests"
          description="AI Test Generator reads the tool's inputSchema and drafts realistic test cases — happy-path, edges, and failure probes."
          action={<div className="w-full max-w-md"><ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} /></div>}
        />
      </CardBody></Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3 h-full min-h-0">
      {/* Config panel */}
      <Card className="col-span-12 lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">Gemini Test Generator</span>
          </div>
          {aiStatus && (
            aiStatus.configured || aiStatus.ready || aiStatus.available
              ? <StatusBadge status="healthy" label={aiStatus.model || 'Ready'} />
              : <StatusBadge status="unhealthy" label="AI disabled" />
          )}
        </div>
        <div className="p-4 space-y-3 overflow-auto custom-scrollbar">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center justify-between">
              <span>Server</span>
            </div>
            <ServerSelector servers={servers} value={activeId} onChange={setActiveId} onManage={onManageServers} />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center justify-between">
              <span>Tool</span>
              <button onClick={loadTools} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary">
                <RefreshCw className={clsx('w-3 h-3', loadingTools && 'animate-spin')} /> Reload
              </button>
            </div>
            {loadingTools ? <LoadingBlock label="Loading tools…" /> :
              tools.length === 0 ? (
                <div className="text-xs text-gray-500 italic px-2 py-4 border border-dashed border-dark-700 rounded-md text-center">No tools exposed.</div>
              ) : (
                <div className="max-h-56 overflow-auto custom-scrollbar rounded-md border border-dark-700/60 divide-y divide-dark-700/60">
                  {tools.map(t => {
                    const active = selectedTool?.name === t.name;
                    return (
                      <button key={t.name} onClick={() => setSelectedTool(t)}
                        className={clsx('w-full flex items-start gap-2 px-3 py-2 text-left transition-colors',
                          active ? 'bg-primary/10' : 'hover:bg-dark-700/50')}>
                        <Wrench className={clsx('w-3.5 h-3.5 mt-0.5', active ? 'text-primary' : 'text-gray-500')} />
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-gray-100 truncate">{t.name}</div>
                          {t.description && <div className="text-xs text-gray-500 line-clamp-2">{t.description}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            }
          </div>

          <Field label="How many test cases?" hint="Gemini will draft this many variations (happy + edge + failure).">
            <TextInput type="number" min={1} max={30} value={count} onChange={e => setCount(e.target.value)} />
          </Field>

          <Field label="Extra instructions (optional)" hint="e.g. 'focus on boundary conditions' or 'cover auth failure'.">
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Free-form notes for Gemini…"
              className="w-full rounded-md bg-probestack-bg border border-dark-700 px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 custom-scrollbar"
            />
          </Field>

          <Button variant="primary" icon={Wand2} onClick={handleGenerate} loading={generating} disabled={!selectedTool}
            className="w-full justify-center">
            Generate tests
          </Button>
        </div>
      </Card>

      {/* Result */}
      <Card className="col-span-12 lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-700/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Generated suite</span>
          {tests && (
            <button onClick={handleCopy} className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy JSON'}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-3">
          {!tests ? (
            <EmptyState icon={Zap} title="Nothing generated yet" description="Pick a tool on the left and click Generate." />
          ) : (
            <TestSuite data={tests} toolName={selectedTool?.name} />
          )}
        </div>
      </Card>
    </div>
  );
}

function TestSuite({ data, toolName }) {
  const cases = data.testCases || data.tests || (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">
        {cases.length ? <>Generated <span className="text-white font-semibold">{cases.length}</span> test case{cases.length === 1 ? '' : 's'} for <span className="font-mono text-primary">{toolName}</span>.</> : 'No test cases returned.'}
      </div>
      {cases.map((c, i) => (
        <div key={i} className="rounded-lg border border-dark-700/60 bg-dark-900/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-dark-700/60 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/15 text-primary text-xs font-mono font-bold flex items-center justify-center">{i + 1}</span>
            <span className="text-xs font-semibold text-white truncate">{c.name || c.title || `Test ${i + 1}`}</span>
            {c.type && <span className="ml-auto text-xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-dark-700 text-gray-300">{c.type}</span>}
          </div>
          {c.description && <div className="px-3 py-2 text-[11px] text-gray-400 border-b border-dark-700/60">{c.description}</div>}
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            <JsonViewer data={c.arguments || c.input || {}} title="arguments" maxHeight={200} />
            <JsonViewer data={c.expected || c.expect || c.assertions || {}} title="expected" maxHeight={200} />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t border-dark-700/50">
        <JsonViewer data={data} title="raw response" maxHeight={260} />
      </div>
    </div>
  );
}
