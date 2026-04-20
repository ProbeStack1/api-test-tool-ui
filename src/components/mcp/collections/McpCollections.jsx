// src/components/mcp/collections/McpCollections.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  Layers, Plus, Play, RefreshCw, Edit3, Trash2, ChevronDown, ChevronRight, Check, X,
  ListChecks, Clock, History,
} from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import { LoadingBlock } from '../shared/Spinner';
import Modal, { ModalButton } from '../shared/Modal';
import StatusBadge from '../shared/StatusBadge';
import JsonEditor from '../shared/JsonEditor';
import JsonViewer from '../shared/JsonViewer';
import { Button, Field, TextInput, Select } from '../shared/Field';
import ServerSelector from '../shared/ServerSelector';
import {
  mcpListCollections, mcpCreateCollection, mcpUpdateCollection, mcpDeleteCollection,
  mcpRunCollection, mcpListCollectionRuns, mcpGetCollectionRun,
} from '../../../services/mcpService';

const EMPTY_STEP = () => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  kind: 'tool',          // 'tool' | 'resource' | 'prompt' | 'ping'
  toolName: '',
  argumentsJson: '{\n  \n}',
  assertions: [],
});

const ASSERTION_TYPES = [
  { id: 'success',           label: 'Call succeeded' },
  { id: 'contains',          label: 'Body contains' },
  { id: 'not_contains',      label: 'Body does not contain' },
  { id: 'json_path_exists',  label: 'JSON path exists' },
  { id: 'json_path_equals',  label: 'JSON path equals' },
  { id: 'regex_match',       label: 'Body matches regex' },
  { id: 'latency_below_ms',  label: 'Latency below (ms)' },
];

export default function McpCollections({ servers, activeId, setActiveId, workspaceId, onManageServers }) {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // full editor open
  const [runHistory, setRunHistory] = useState([]);
  const [runningId, setRunningId] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await mcpListCollections(workspaceId);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setCollections(list);
      setSelected(prev => prev && list.find(c => c.id === prev.id) ? list.find(c => c.id === prev.id) : list[0] || null);
    } catch (err) { toast.error('Failed to load collections'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  // reset delete confirmation when selection changes
  useEffect(() => { setConfirmDelete(false); setRunResult(null); }, [selected?.id]);

  // load run history for selected collection
  useEffect(() => {
    if (!selected) { setRunHistory([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await mcpListCollectionRuns(selected.id, { limit: 10 });
        if (!cancelled) setRunHistory(Array.isArray(data) ? data : (data?.items || []));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const handleCreate = () => setEditing({
    name: '', description: '',
    serverId: activeId || null,
    steps: [EMPTY_STEP()],
    isNew: true,
  });

  const handleEdit = (c) => setEditing({
    id: c.id, name: c.name || '', description: c.description || '',
    serverId: c.serverId || c.server_id || activeId,
    steps: (c.steps || []).map(s => ({
      id: s.id || Math.random().toString(36).slice(2),
      name: s.name || '',
      kind: s.kind || 'tool',
      toolName: s.toolName || s.tool_name || '',
      argumentsJson: s.arguments ? JSON.stringify(s.arguments, null, 2) : '{\n  \n}',
      assertions: s.assertions || [],
    })),
  });

  const handleDelete = async (c) => {
    try {
      await mcpDeleteCollection(c.id);
      toast.success('Collection deleted');
      setConfirmDelete(false);
      refresh();
    } catch { toast.error('Delete failed'); }
  };

  const handleSaveEditor = async () => {
    if (!editing.name.trim()) { toast.error('Name is required'); return; }
    // parse arguments
    const steps = editing.steps.map(s => {
      let args = {};
      if (s.argumentsJson?.trim()) {
        try { args = JSON.parse(s.argumentsJson); } catch { throw new Error(`Step "${s.name || s.toolName}" arguments not valid JSON`); }
      }
      return { name: s.name, kind: s.kind, toolName: s.toolName, arguments: args, assertions: s.assertions };
    });
    const payload = {
      workspaceId, name: editing.name.trim(), description: editing.description.trim() || null,
      serverId: editing.serverId, steps,
    };
    try {
      if (editing.isNew) await mcpCreateCollection(payload);
      else await mcpUpdateCollection(editing.id, payload);
      toast.success('Collection saved');
      setEditing(null);
      refresh();
    } catch (err) { toast.error(err.message || 'Save failed'); }
  };

  const handleRun = async (c) => {
    setRunningId(c.id);
    try {
      const { data } = await mcpRunCollection(c.id);
      setRunResult(data);
      // refresh run history
      const rh = await mcpListCollectionRuns(c.id, { limit: 10 });
      setRunHistory(Array.isArray(rh.data) ? rh.data : (rh.data?.items || []));
      const passed = data.passed_steps ?? data.passedSteps ?? 0;
      const total  = data.total_steps  ?? data.totalSteps  ?? (data.step_results?.length || 0);
      toast.success(`Run complete: ${passed}/${total} passed`);
    } catch (err) { toast.error('Run failed'); }
    finally { setRunningId(null); }
  };

  const handleOpenRun = async (runId) => {
    try { const { data } = await mcpGetCollectionRun(runId); setRunResult(data); }
    catch { toast.error('Unable to load run'); }
  };

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> MCP Collections
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Batch-run tool invocations against a server with per-step assertions — your MCP Postman Runner.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refresh}>Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={handleCreate}>New collection</Button>
        </div>
      </div>

      {loading && collections.length === 0 ? (
        <LoadingBlock label="Loading collections…" />
      ) : collections.length === 0 ? (
        <Card><CardBody>
          <EmptyState
            icon={Layers}
            title="No MCP collections yet"
            description="Group tool calls and assertions into a reusable suite. Great for regression runs and demos."
            action={<Button variant="primary" icon={Plus} onClick={handleCreate}>Create your first collection</Button>}
          />
        </CardBody></Card>
      ) : (
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* list */}
          <Card className="col-span-12 md:col-span-4 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-dark-700/60 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              {collections.length} collection{collections.length === 1 ? '' : 's'}
            </div>
            <ul className="flex-1 overflow-auto custom-scrollbar p-1.5 space-y-1">
              {collections.map(c => {
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button onClick={() => setSelected(c)}
                      className={clsx(
                        'w-full text-left px-3 py-2 rounded-md border transition-colors',
                        active ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-dark-700/50'
                      )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-100 truncate">{c.name}</span>
                        <span className="text-xs text-gray-500 font-mono shrink-0">{(c.steps || []).length} steps</span>
                      </div>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* detail */}
          <Card className="col-span-12 md:col-span-8 flex flex-col min-h-0 overflow-hidden">
            {!selected ? <EmptyState icon={Layers} title="Select a collection" /> : (
              <>
                <div className="px-4 py-3 border-b border-dark-700/60 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{selected.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{selected.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 relative">
                    <Button size="sm" variant="outline" icon={Edit3} onClick={() => handleEdit(selected)}>Edit</Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>
                    <Button size="sm" variant="primary" icon={Play} loading={runningId === selected.id} onClick={() => handleRun(selected)}>Run</Button>
                    {confirmDelete && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setConfirmDelete(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-lg border border-red-500/40 bg-dark-800 shadow-2xl shadow-red-500/10 p-3 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white">Delete collection?</div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate">“{selected.name}” will be removed.</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-3">
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="text-xs px-2.5 py-1 rounded-md text-gray-300 hover:bg-dark-700 transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(selected)}
                              className="text-xs px-2.5 py-1 rounded-md bg-red-500/90 hover:bg-red-500 text-white font-medium transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden min-h-0">
                  {runResult ? (
                    <RunResultPanel result={runResult} onClose={() => setRunResult(null)} />
                  ) : (
                    <>
                      <div className="col-span-12 lg:col-span-7 flex flex-col gap-2 min-h-0 overflow-auto custom-scrollbar">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5" /> Steps
                        </div>
                        {(selected.steps || []).length === 0 ? (
                          <div className="text-xs text-gray-500 italic">No steps defined yet.</div>
                        ) : (
                          (selected.steps || []).map((s, idx) => (
                            <div key={s.id || idx} className="rounded-md border border-dark-700/60 bg-dark-900/40 p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-primary/15 text-primary text-xs font-mono font-bold flex items-center justify-center">{idx + 1}</span>
                                <span className="text-xs font-medium text-gray-200 truncate">{s.name || s.toolName || 'Step'}</span>
                                <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-dark-700 text-gray-400 uppercase tracking-wider">{s.kind}</span>
                              </div>
                              {s.toolName && <div className="mt-1 text-xs font-mono text-gray-400 truncate">{s.toolName}</div>}
                              {(s.assertions || []).length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {(s.assertions || []).map((a, i) => (
                                    <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                                      {a.type}{a.value != null && `: ${a.value}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
                        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5 mb-2">
                          <History className="w-3.5 h-3.5" /> Recent runs
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar space-y-1">
                          {runHistory.length === 0 ? (
                            <div className="text-xs text-gray-500 italic">No runs yet.</div>
                          ) : runHistory.map(r => {
                            const rid = r.id || r.runId;
                            const total = r.total_steps ?? r.totalSteps ?? r.total ?? (r.steps?.length || 0);
                            const passed = r.passed_steps ?? r.passedSteps ?? r.passed ?? 0;
                            const ms = r.total_ms ?? r.totalMs ?? r.durationMs ?? r.duration_ms ?? '—';
                            const when = r.started_at || r.startedAt || r.createdAt || r.created_at;
                            const statusKey = (r.status || '').toLowerCase();
                            const badge = statusKey === 'success' || statusKey === 'passed' ? 'healthy'
                                        : statusKey === 'failed' ? 'unhealthy'
                                        : 'degraded';
                            return (
                              <button key={rid} onClick={() => handleOpenRun(rid)}
                                className="w-full text-left px-2.5 py-2 rounded border border-dark-700/60 hover:border-primary/40 bg-dark-900/30 transition-colors">
                                <div className="flex items-center justify-between">
                                  <StatusBadge status={badge} label={r.status || 'done'} size="xs" />
                                  <span className="text-xs text-gray-500 font-mono">{ms}ms</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-400 font-mono truncate">
                                  {when ? new Date(when).toLocaleString() : '—'}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {passed}/{total} passed
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <CollectionEditor
          editor={editing}
          setEditor={setEditing}
          servers={servers}
          onClose={() => setEditing(null)}
          onSave={handleSaveEditor}
          onManageServers={onManageServers}
        />
      )}
    </div>
  );
}

/* ────────── Editor ────────── */

function CollectionEditor({ editor, setEditor, servers, onClose, onSave, onManageServers }) {
  const addStep = () => setEditor(e => ({ ...e, steps: [...e.steps, EMPTY_STEP()] }));
  const removeStep = (id) => setEditor(e => ({ ...e, steps: e.steps.filter(s => s.id !== id) }));
  const patchStep = (id, patch) => setEditor(e => ({ ...e, steps: e.steps.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const addAssertion = (id) => patchStep(id, { assertions: [...(editor.steps.find(s => s.id === id).assertions || []), { type: 'success', value: '' }] });
  const removeAssertion = (id, idx) => {
    const step = editor.steps.find(s => s.id === id);
    patchStep(id, { assertions: step.assertions.filter((_, i) => i !== idx) });
  };
  const patchAssertion = (id, idx, patch) => {
    const step = editor.steps.find(s => s.id === id);
    const arr = step.assertions.map((a, i) => i === idx ? { ...a, ...patch } : a);
    patchStep(id, { assertions: arr });
  };

  return (
    <Modal
      isOpen onClose={onClose}
      title={editor.isNew ? 'New MCP Collection' : 'Edit MCP Collection'}
      subtitle="Define an ordered sequence of tool calls with optional assertions."
      size="2xl"
      footer={<>
        <ModalButton variant="ghost" onClick={onClose}>Cancel</ModalButton>
        <ModalButton variant="primary" onClick={onSave}>Save</ModalButton>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Name" required className="col-span-12 md:col-span-6">
            <TextInput value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} placeholder="Regression: GitHub MCP" autoFocus />
          </Field>
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Server</div>
            <ServerSelector servers={servers} value={editor.serverId} onChange={(id) => setEditor({ ...editor, serverId: id })} onManage={onManageServers} />
          </div>
        </div>
        <Field label="Description">
          <TextInput value={editor.description} onChange={e => setEditor({ ...editor, description: e.target.value })} placeholder="What does this suite validate?" />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Steps</div>
            <Button size="sm" variant="outline" icon={Plus} onClick={addStep}>Add step</Button>
          </div>
          <div className="space-y-2">
            {editor.steps.map((s, idx) => (
              <div key={s.id} className="rounded-lg border border-dark-700/60 bg-dark-900/40 p-3">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 md:col-span-4">
                    <Field label={`Step ${idx + 1} name`}>
                      <TextInput value={s.name} onChange={e => patchStep(s.id, { name: e.target.value })} placeholder="Descriptive name" />
                    </Field>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Field label="Kind">
                      <Select value={s.kind} onChange={e => patchStep(s.id, { kind: e.target.value })}>
                        <option value="tool">tool</option>
                        <option value="resource">resource</option>
                        <option value="prompt">prompt</option>
                        <option value="ping">ping</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-6 md:col-span-5">
                    <Field label={s.kind === 'resource' ? 'URI' : s.kind === 'prompt' ? 'Prompt name' : s.kind === 'ping' ? '—' : 'Tool name'}>
                      <TextInput value={s.toolName} onChange={e => patchStep(s.id, { toolName: e.target.value })} placeholder={s.kind === 'resource' ? 'resource://…' : s.kind === 'prompt' ? 'prompt_name' : 'tool_name'} disabled={s.kind === 'ping'} />
                    </Field>
                  </div>
                </div>
                <div className="mt-2">
                  <JsonEditor
                    label="Arguments"
                    value={s.argumentsJson}
                    onChange={v => patchStep(s.id, { argumentsJson: v })}
                    rows={4}
                  />
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Assertions</div>
                    <button onClick={() => addAssertion(s.id)} className="text-xs text-primary hover:underline">+ Add assertion</button>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    {(s.assertions || []).map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Select value={a.type} onChange={e => patchAssertion(s.id, i, { type: e.target.value })} className="max-w-[200px]">
                          {ASSERTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </Select>
                        <TextInput value={a.path || ''} onChange={e => patchAssertion(s.id, i, { path: e.target.value })} placeholder="path (for equals)" className="max-w-[200px]" />
                        <TextInput value={a.value ?? ''} onChange={e => patchAssertion(s.id, i, { value: e.target.value })} placeholder="expected value" className="flex-1" />
                        <button onClick={() => removeAssertion(s.id, i)} className="p-1.5 rounded hover:bg-red-500/15 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => removeStep(s.id)}>Remove step</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}


/* ────────── Run Result Panel (inline, replaces Steps+History when present) ────────── */

function RunResultPanel({ result, onClose }) {
  const steps  = result.step_results || result.stepResults || [];
  const total  = result.total_steps  ?? result.totalSteps  ?? steps.length;
  const passed = result.passed_steps ?? result.passedSteps ?? 0;
  const failed = result.failed_steps ?? result.failedSteps ?? 0;
  const skipped= result.skipped_steps ?? result.skippedSteps ?? 0;
  const ms     = result.total_ms ?? result.totalMs ?? result.durationMs ?? '—';
  const status = (result.status || '').toLowerCase();
  const statusKey = status === 'success' || status === 'passed' ? 'healthy'
                  : status === 'failed' ? 'unhealthy'
                  : 'degraded';

  return (
    <div className="col-span-12 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
      {/* Header strip */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-dark-700/60 bg-dark-900/50 mb-2">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-white">Run Result</span>
          <StatusBadge status={statusKey} label={result.status || 'done'} size="xs" />
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
          <span className="text-emerald-400">{passed} passed</span>
          {failed > 0  && <span className="text-red-400">{failed} failed</span>}
          {skipped > 0 && <span className="text-gray-500">{skipped} skipped</span>}
          <span className="text-gray-500">· {total} total</span>
          <span className="inline-flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" />{ms}ms</span>
        </div>
        <button
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dark-700/60 hover:border-primary/40 hover:bg-dark-700/50 text-xs text-gray-300 transition-colors">
          <X className="w-3 h-3" /> Close
        </button>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pr-1">
        {steps.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No step results.</div>
        ) : steps.map((s, i) => (
          <StepResultCard key={s.step_id || s.stepId || i} step={s} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ────────── Step Result Card (inside RunResultPanel) ────────── */

function StepResultCard({ step: s, index: i }) {
  const [reqMode, setReqMode] = useState('beautified'); // 'beautified' | 'raw'
  const [resMode, setResMode] = useState('beautified');

  const name    = s.step_name || s.stepName || s.name || `Step ${i + 1}`;
  const latency = s.latency_ms ?? s.latencyMs ?? s.durationMs ?? '—';
  const inv     = s.invocation || {};
  const parsed  = inv.parsed_result ?? inv.parsedResult;
  const rawReq  = inv.request_json  ?? inv.requestJson;
  const rawRes  = inv.response_json ?? inv.responseJson;
  const args    = inv.arguments ?? (() => {
    try {
      const obj = typeof rawReq === 'string' ? JSON.parse(rawReq) : rawReq;
      return obj?.params ?? null;
    } catch { return null; }
  })();
  const errMsg  = inv.error_message ?? inv.errorMessage ?? s.error;
  const asserts = s.assertion_results || s.assertionResults || [];

  const icon = s.skipped
    ? <span className="w-4 h-4 rounded-full border border-gray-500 text-[11px] font-bold text-gray-500 flex items-center justify-center">↷</span>
    : s.passed
      ? <Check className="w-4 h-4 text-emerald-400" />
      : <X className="w-4 h-4 text-red-400" />;

  return (
    <div className={clsx(
      'rounded-md border p-3 transition-colors',
      s.skipped ? 'border-dark-700/60 bg-dark-900/30'
      : s.passed ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
      : 'border-red-500/30 bg-red-500/[0.04]'
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-100 truncate">{name}</span>
        {inv.method && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-dark-700 text-gray-400 uppercase tracking-wider font-mono">{inv.method}</span>
        )}
        {inv.target && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono truncate">{inv.target}</span>
        )}
        <span className="ml-auto text-xs text-gray-500 font-mono inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />{latency}ms
        </span>
      </div>

      {errMsg && <p className="mt-1.5 text-xs text-red-400 font-mono">{errMsg}</p>}

      {asserts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {asserts.map((a, j) => (
            <span key={j} className={clsx('text-xs px-1.5 py-0.5 rounded font-mono',
              a.passed ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                       : 'bg-red-500/10 text-red-300 border border-red-500/30')}>
              {a.type}{a.message ? ` · ${a.message}` : (a.expected != null && a.expected !== '' ? `: ${a.expected}` : '')}
            </span>
          ))}
        </div>
      )}

      {!s.skipped && (args != null || rawReq) && (
        <JsonSection
          title="Request"
          mode={reqMode}
          setMode={setReqMode}
          beautified={args}
          raw={rawReq}
        />
      )}

      {!s.skipped && (parsed != null || rawRes) && (
        <JsonSection
          title="Response"
          mode={resMode}
          setMode={setResMode}
          beautified={parsed}
          raw={rawRes}
        />
      )}
    </div>
  );
}

/** Helper: titled section with Beautified/Raw toggle + JsonViewer. */
function JsonSection({ title, mode, setMode, beautified, raw }) {
  const showing = mode === 'raw' ? raw : beautified;
  const hasBeautified = beautified !== undefined && beautified !== null;
  const hasRaw        = raw !== undefined && raw !== null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{title}</span>
        <div className="flex items-center rounded border border-dark-700/60 overflow-hidden">
          <button
            disabled={!hasBeautified}
            onClick={() => setMode('beautified')}
            className={clsx(
              'text-xs px-2 py-0.5 transition-colors',
              mode === 'beautified'
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-dark-700/50',
              !hasBeautified && 'opacity-40 cursor-not-allowed'
            )}>
            Beautified
          </button>
          <button
            disabled={!hasRaw}
            onClick={() => setMode('raw')}
            className={clsx(
              'text-xs px-2 py-0.5 transition-colors border-l border-dark-700/60',
              mode === 'raw'
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-dark-700/50',
              !hasRaw && 'opacity-40 cursor-not-allowed'
            )}>
            Raw
          </button>
        </div>
      </div>
      <JsonViewer data={showing} title={null} maxHeight={220} />
    </div>
  );
}
