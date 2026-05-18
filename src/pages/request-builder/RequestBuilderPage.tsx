/**
 * RequestBuilder — Postman-parity editor.
 *
 * Wiring:
 *  - Sidebar → openRequest({id, method, name, url, collectionId, folderId})
 *    → we fetch the full ApiRequest from the BFF (react-query) and seed
 *    all local state (url, params, headers, body, auth, scripts) from it.
 *  - Local adhoc tabs (id starts with 't') work off in-memory state only.
 *  - Every free-text field uses <VariableInput> → `{{var}}` highlighting
 *    + autocomplete + hover tooltip across the whole builder.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Save, Plus, X, ChevronUp, ChevronDown, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { VariableInput } from '@/components/ui/VariableInput';
import { Select } from '@/components/ui/Select';
import { useLayout } from '@/stores/layout.store';
import { useRequests } from '@/stores/requests.store';
import { useRequestDraftStore } from '@/stores/requestDraft.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSettings } from '@/stores/settings.store';
import { ResponsePanel } from '@/components/request-builder/parts/ResponsePanel';
import { CollabCommentsPanel } from '@/components/collab/CollabCommentsPanel';
import { LiveStepperStrip } from '@/components/request-builder/parts/LiveExecutionView';
import { useStreamStore } from '@/stores/stream.store';
import { useShortcut } from '@/hooks/useShortcut';
import { useRowContextMenu } from '@/components/ui/RowContextMenu';
import type { RowContextItem } from '@/components/ui/RowContextMenu';
import { Pencil, Copy, Share2, Trash2 } from 'lucide-react';
import { useSavedResponsePreview } from '@/stores/savedResponsePreview.store';
import { executeStream } from '@/services/request.stream';
import { adhocExecute } from '@/services/adhoc.service';
import { executeRequest, getRequest, createRequest, updateRequest as updateRequestSvc, type ExecutionResult } from '@/services/request.service';
import { useChatbot } from '@/stores/chatbot.store';
import { useRunsStore } from '@/stores/runs.store';
import { useRunHistoryStore } from '@/stores/runHistory.store';
import { KVTable, type KVRow } from '@/components/request-builder/parts/KVTable';
import { BodyEditor, type RequestBody, type FormDataRow } from '@/components/request-builder/parts/BodyEditor';
import { AuthEditor, type AuthConfig, type AuthType } from '@/components/request-builder/parts/AuthEditor';
import { ScriptEditor } from '@/components/request-builder/parts/ScriptEditor';
import type { FileValue } from '@/components/request-builder/parts/FilePicker';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const MC: Record<Method, string> = {
  GET: 'text-method-get', POST: 'text-method-post', PUT: 'text-method-put',
  PATCH: 'text-method-patch', DELETE: 'text-method-delete',
  HEAD: 'text-method-head', OPTIONS: 'text-method-options',
};

const TABS = ['Params', 'Headers', 'Body', 'Auth', 'Pre-request Script', 'Tests', 'Comments'] as const;
type Tab = (typeof TABS)[number];

const DEFAULT_AUTO_HEADERS: KVRow[] = [
  { id: 'h_accept',    key: 'Accept',          value: '*/*',                 enabled: true, auto: true },
  { id: 'h_enc',       key: 'Accept-Encoding', value: 'gzip, deflate, br',   enabled: true, auto: true },
  { id: 'h_ua',        key: 'User-Agent',      value: 'ForgeFuzz/0.1',          enabled: true, auto: true },
  { id: 'h_conn',      key: 'Connection',      value: 'keep-alive',          enabled: true, auto: true },
];

/* Auth → toggleable header projection (Postman parity).
 *
 * Whatever the user types in the Auth tab is reflected as a regular,
 * checkbox-toggleable row at the top of the Headers tab. The user can:
 *   • see exactly what will hit the wire,
 *   • untick the row to drop the header from this one request,
 *   • re-tick to bring it back,
 *   • EDIT the value inline for the simple auth types — those edits are
 *     parsed back into the Auth-tab state so the two tabs always agree.
 *
 * Only header-bound auths produce rows. apikey/oauth2 with `addTo='query'`
 * are intentionally skipped (those go on the URL, not in headers). */
type DerivedAuthRow = KVRow & { editable: boolean };
const deriveAuthHeaders = (auth: AuthConfig): DerivedAuthRow[] => {
  const t = auth?.type;
  const c: any = auth?.config ?? {};
  if (!t || t === 'noauth' || t === 'inherit') return [];
  if (t === 'bearer' && c.token) {
    return [{ id: 'auth_bearer', key: 'Authorization', value: `Bearer ${c.token}`, enabled: true, auto: true, editable: true }];
  }
  if (t === 'basic' && (c.username || c.password)) {
    let token: string;
    try { token = btoa(`${c.username ?? ''}:${c.password ?? ''}`); }
    catch { token = '<base64>'; }
    return [{ id: 'auth_basic', key: 'Authorization', value: `Basic ${token}`, enabled: true, auto: true, editable: true }];
  }
  if (t === 'apikey' && (c.addTo ?? 'header') === 'header' && c.key) {
    return [{ id: 'auth_apikey', key: c.key, value: c.value ?? '', enabled: true, auto: true, editable: true }];
  }
  if (t === 'oauth2' && (c.addTo ?? 'header') === 'header' && c.accessToken) {
    const prefix = c.headerPrefix || 'Bearer';
    return [{ id: 'auth_oauth2', key: 'Authorization', value: `${prefix} ${c.accessToken}`, enabled: true, auto: true, editable: true }];
  }
  /* digest / oauth1 / hawk / awsv4 / ntlm produce a single Authorization
   * header too, but its computation requires the request URL + body
   * (signature, nonce, …). Show a placeholder so the user knows something
   * will be added on send. NOT editable — the value is generated. */
  if (t === 'digest' || t === 'oauth1' || t === 'hawk' || t === 'awsv4' || t === 'ntlm') {
    return [{ id: `auth_${t}`, key: 'Authorization', value: `<computed at send · ${t.toUpperCase()}>`, enabled: true, auto: true, editable: false }];
  }
  return [];
};

/** Inverse of `deriveAuthHeaders` — given a row id and a new value typed
 *  in the Headers tab, return the patch we should apply to the Auth tab.
 *  Returns null when the auth type can't be cleanly parsed back (e.g.
 *  digest/awsv4/etc. — those use computed values). */
const parseAuthRowEdit = (
  rowId: string,
  newValue: string,
  auth: AuthConfig,
): AuthConfig | null => {
  switch (rowId) {
    case 'auth_bearer': {
      const token = newValue.replace(/^\s*Bearer\s+/i, '').trim();
      return { type: 'bearer', config: { ...auth.config, token } };
    }
    case 'auth_basic': {
      const b64 = newValue.replace(/^\s*Basic\s+/i, '').trim();
      let username = '', password = '';
      try {
        const dec = atob(b64);
        const idx = dec.indexOf(':');
        username = idx >= 0 ? dec.slice(0, idx) : dec;
        password = idx >= 0 ? dec.slice(idx + 1) : '';
      } catch {/* leave empty */}
      return { type: 'basic', config: { ...auth.config, username, password } };
    }
    case 'auth_apikey':
      return { type: 'apikey', config: { ...auth.config, value: newValue } };
    case 'auth_oauth2': {
      const prefix = (auth.config as any)?.headerPrefix || 'Bearer';
      const accessToken = newValue.replace(new RegExp(`^\\s*${prefix}\\s+`, 'i'), '').trim();
      return { type: 'oauth2', config: { ...auth.config, accessToken } };
    }
    default:
      return null;
  }
};

export const RequestBuilderPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const primaryTab = useLayout((s) => s.primaryTab);
  const allOpen = useRequests((s) => s.open);
  // Show ONLY tabs that belong to the current workspace AND match the
  // current primary context (Collection ↔ History are isolated per the
  // user's request — a saved-request tab opened from Collections stays
  // out of sight while the History rail is active and vice-versa).
  // Tabs without a project tag (legacy / scratch) stay visible everywhere
  // so we never strand the user with no tabs.
  const open = useMemo(
    () => allOpen.filter((t) => {
      if (t.workspaceId && ws?.id && t.workspaceId !== ws.id) return false;
      if (primaryTab === 'collection' || primaryTab === 'history') {
        const src = t.source ?? 'collection';
        return src === primaryTab;
      }
      return true;
    }),
    [allOpen, ws?.id, primaryTab],
  );
  const activeId = useRequests((s) => s.activeId);
  const setActive = useRequests((s) => s.setActive);
  const closeReq = useRequests((s) => s.closeRequest);
  const newUntitled = useRequests((s) => s.newUntitled);
  const setMeta = useRequests((s) => s.setMeta);

  const active = open.find((o) => o.id === activeId) ?? open[0];
  const isSavedRequest = !!active?.id && active.id.includes('-') && active.id.length > 20;
  const renameTab = useRequests((s) => s.rename);
  const qc = useQueryClient();

  /* Inline tab rename (double-click a tab → editable input). */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const commitRename = async (id: string) => {
    const next = renameDraft.trim();
    setRenamingId(null);
    const tab = open.find((t) => t.id === id);
    if (!tab) return;
    if (!next || next === tab.name) return;
    renameTab(id, next);
    /* If it's a persisted saved request, push the rename to the backend
     * + invalidate sidebar so the tree reflects the new name immediately. */
    const isSaved = id.includes('-') && id.length > 20;
    if (isSaved) {
      try {
        await updateRequestSvc(id, { name: next } as any);
        qc.invalidateQueries({ queryKey: ['requests'] });
      } catch (e: any) {
        toast.error(e?.message || 'Rename failed');
      }
    }
  };

  const [method, setMethod] = useState<Method>(active?.method ?? 'GET');
  const [url, setUrl] = useState(active?.url ?? '');
  const [tab, setTab] = useState<Tab>('Params');

  /* Sending + result state lives in a Zustand store keyed by tabId so
   * primary-tab switches don't unmount the data. The Promise itself
   * continues running irrespective of React lifecycle; the store keeps
   * the eventual `setResult` reachable. */
  const tabIdForRuns = active?.id ?? 'default';
  const sending = useRunsStore((s) => s.byTab[tabIdForRuns]?.sending ?? false);
  const result = useRunsStore((s) => s.byTab[tabIdForRuns]?.result ?? null);
  const setResult = (r: ExecutionResult | null) => useRunsStore.getState().setResult(tabIdForRuns, r);

  /* Saved-response preview: when user clicks a saved response in the
   * sidebar, project it into this tab's response panel as a synthetic
   * ExecutionResult so the same Body / Headers / Logs UI works. */
  const preview = useSavedResponsePreview((s) => s.preview);
  useEffect(() => {
    if (!preview) return;
    if (preview.requestId !== active?.id) return;
    const sr: any = preview.saved;
    const code = sr.status ?? sr.status_code ?? 0;
    setResult({
      runId: sr.id,
      status: 'SUCCESS',
      totalMs: sr.total_ms ?? 0,
      finalUrl: sr.url ?? '',
      method: sr.method ?? 'GET',
      sentHeaders: (sr.sent_headers || []).map((h: any) => ({ ...h, source: 'USER' as const, isSecret: false })),
      sentBody: sr.sent_body || '',
      network: { statusCode: code, sizeBytes: sr.response?.sizeBytes ?? (sr.body || '').length },
      phases: [],
      response: {
        statusCode: code,
        statusText: sr.status_text || '',
        headers: sr.headers || sr.response?.headers || [],
        body: sr.body || sr.response?.body || '',
        sizeBytes: sr.response?.sizeBytes ?? (sr.body || '').length,
        contentType: sr.contentType || '',
      },
      scripts: null,
      error: null,
      runAt: sr.createdAt || sr.saved_at || '',
    } as any);
    expandResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.saved?.id, active?.id]);
  const [params, setParams] = useState<KVRow[]>(() => parseUrlParams(active?.url ?? ''));
  const [headers, setHeaders] = useState<KVRow[]>([]);
  const [body, setBody] = useState<RequestBody>({ mode: 'none' });
  const [auth, setAuth] = useState<AuthConfig>({ type: 'noauth', config: {} });
  const [preScript, setPreScript] = useState('');
  const [testScript, setTestScript] = useState('');
  const [showParamDesc, setShowParamDesc] = useState(false);
  const [showHeaderDesc, setShowHeaderDesc] = useState(false);
  /* IDs of auth-derived headers the user has explicitly disabled in the
   * Headers tab. Lets a user keep their `Authorization: Bearer …` config
   * in the Auth tab while temporarily disabling it on this request. */
  const [disabledAuthHeaderIds, setDisabledAuthHeaderIds] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveEnabled = useSettings((s) => s.autoSaveEnabled);
  const autoSaveDelayMs = useSettings((s) => s.autoSaveDelayMs);

  /* ─────── Sync the right-rail Snippet panel ─────── *
   * Push a thin HAR-like snapshot of the current editor state into the
   * shared draft store whenever anything the snippet cares about changes.
   * The Snippet panel subscribes and regenerates code live. */
  const setSnapshot = useRequestDraftStore((s) => s.setSnapshot);
  const clearSnapshot = useRequestDraftStore((s) => s.clear);

  /* ─────── One-shot handoff pickup (History → builder) ─────── *
   * When the user hits "Edit & Try" on the History page, that page
   * drops a full snapshot into the store's `pendingHandoff` slot and
   * navigates here. We consume it exactly once on mount and hydrate
   * local state. Without this the builder's own per-keystroke
   * snapshot-writer (below) clobbers the handoff before we can read
   * it — exactly the bug the user reported: "try page flashes for a
   * second, then empty builder appears". */
  useEffect(() => {
    const handoff = useRequestDraftStore.getState().consumeHandoff();
    if (!handoff) return;
    if (handoff.method) setMethod(handoff.method as Method);
    if (typeof handoff.url === 'string') setUrl(handoff.url);
    if (handoff.queryParams) setParams(handoff.queryParams.map((p, i) => ({
      id: `p_${i}`, key: p.name, value: p.value, enabled: p.enabled !== false,
    })));
    if (handoff.headers) setHeaders(handoff.headers.map((h, i) => ({
      id: `h_${i}`, key: h.name, value: h.value, enabled: h.enabled !== false,
    })));
    const bk = handoff.bodyKind;
    if (bk === 'json' || bk === 'text' || bk === 'raw') {
      setBody({ mode: 'raw', raw: handoff.bodyText ?? '', language: (bk === 'text' ? 'text' : 'json') as any, formData: [], urlEncoded: [] });
    } else if (bk === 'form-urlencoded') {
      setBody({ mode: 'x-www-form-urlencoded', raw: '', language: 'json' as any, formData: [],
        urlEncoded: (handoff.bodyForm ?? []).map((f, i) => ({ id: `ue_${i}`, key: f.name, value: f.value, enabled: f.enabled !== false })) });
    } else if (bk === 'multipart') {
      setBody({ mode: 'form-data', raw: '', language: 'json' as any, urlEncoded: [],
        formData: (handoff.bodyForm ?? []).map((f, i) => ({ id: `fd_${i}`, key: f.name, type: 'text' as const, value: f.value, enabled: f.enabled !== false })) });
    } else {
      setBody({ mode: 'none' });
    }
    setDirty(true);
  }, []); // run exactly once on mount

  useEffect(() => {
    const kindMap: Record<string, any> = { none: 'none', raw: body.mode === 'raw' && (body as any).language === 'json' ? 'json' : 'raw', 'form-data': 'multipart', 'x-www-form-urlencoded': 'form-urlencoded' };
    const bodyKind = kindMap[body.mode] ?? 'none';
    setSnapshot({
      source: 'request-builder',
      id: active?.id ?? null,
      name: active?.name,
      method,
      url,
      queryParams: params.map((p) => ({ name: p.key, value: p.value, enabled: p.enabled !== false })),
      headers: headers.map((h) => ({ name: h.key, value: h.value, enabled: h.enabled !== false })),
      bodyKind,
      bodyText: body.mode === 'raw' ? (body as any).content ?? '' : undefined,
      bodyForm: (body.mode === 'form-data' || body.mode === 'x-www-form-urlencoded')
        ? ((body as any).fields ?? []).map((f: any) => ({ name: f.key, value: f.value, enabled: f.enabled !== false }))
        : undefined,
    });
    return () => { /* keep last snapshot — user may toggle tabs */ };
  }, [active?.id, active?.name, method, url, params, headers, body, setSnapshot]);
  useEffect(() => () => { clearSnapshot(); }, [clearSnapshot]);

  /* Track each in-flight request so tab-switching never cancels it AND
   * leaving the tab still allows the user to come back and see the result. */
  const inflightRef = useRef<Map<string, AbortController>>(new Map());

  /* Fetch the full saved request whenever activeId points to a real UUID. */
  const { data: loadedRequest } = useQuery({
    queryKey: ['request', active?.id],
    queryFn: () => getRequest(active!.id),
    enabled: isSavedRequest,
  });
  useEffect(() => {
    if (!loadedRequest) return;
    setMethod((loadedRequest.method || 'GET') as Method);
    setUrl(loadedRequest.url?.raw ?? '');
    setParams(parseUrlParams(loadedRequest.url?.raw ?? ''));
    setHeaders(
      (loadedRequest.headers ?? []).map((h: any, i: number) => ({
        id: `h_${i}`, key: h.key || '', value: h.value || '',
        description: h.description, enabled: h.enabled !== false,
      })),
    );
    const b = loadedRequest.body || { mode: 'none' };
    setBody({
      mode: (b.mode || 'none') as any,
      raw: b.raw ?? '',
      language: (b.language ?? 'json') as any,
      formData: b.formdata ? b.formdata.map((r: any, i: number) => ({
        id: `fd_${i}`, key: r.key || '',
        type: (r.type || 'text') as 'text' | 'file',
        value: r.type === 'file' ? { kind: 'none' } as FileValue : (r.value || ''),
        enabled: r.enabled !== false, description: r.description,
      })) : [],
      urlEncoded: b.urlencoded ? b.urlencoded.map((r: any, i: number) => ({
        id: `ue_${i}`, key: r.key || '', value: r.value || '',
        enabled: r.enabled !== false, description: r.description,
      })) : [],
      // GraphQL: hydrate the inner { query, variables } so the
      // CodeMirror editor and the variables JSON editor have content
      // on mount. Backend stores variables as a JSON string already.
      graphql: ((b as any).mode === 'graphql' || (b as any).mode === 'GRAPHQL' || (b as any).graphql)
        ? {
            query:     (b as any).graphql?.query     ?? '',
            variables: (b as any).graphql?.variables ?? '',
          }
        : undefined,
    });
    const a = loadedRequest.auth || { type: 'none' };
    setAuth({ type: normalizeAuth(a.type), config: a });
    setPreScript(loadedRequest.preRequestScript ?? '');
    setTestScript(loadedRequest.testScript ?? '');
    setDirty(false);
    if (active?.id) {
  setMeta(active.id, { collectionId: loadedRequest.collectionId, folderId: loadedRequest.folderId ?? null });
}
  }, [loadedRequest, active?.id, setMeta]);

  /* URL ↔ params bidirectional sync. */
  const onUrlChange = (next: string) => { setUrl(next); setParams(parseUrlParams(next)); markDirty(); };
  const onParamsChange = (rows: KVRow[]) => { setParams(rows); setUrl(rebuildUrl(url, rows)); markDirty(); };
  const markDirty = () => {
    setDirty(true);
    setSavingState('idle');
    /* Reflect dirty state on the open-tab list so a primary dot shows up. */
    if (active?.id) setMeta(active.id, { dirty: true });
  };

  /* Wrap state setters that should mark dirty. */
  const setHeadersDirty = (rows: KVRow[]) => { setHeaders(rows); markDirty(); };
  const setBodyDirty = (b: RequestBody) => { setBody(b); markDirty(); };
  const setAuthDirty = (a: AuthConfig) => { setAuth(a); markDirty(); };
  const setMethodDirty = (m: Method) => { setMethod(m); markDirty(); };
  const setPreScriptDirty = (v: string) => { setPreScript(v); markDirty(); };
  const setTestScriptDirty = (v: string) => { setTestScript(v); markDirty(); };

  const responseExpanded = useLayout((s) => s.responseExpanded);
  const expandResponse = useLayout((s) => s.expandResponse);
  const collapseResponse = useLayout((s) => s.collapseResponse);
  const responseHeight = useLayout((s) => s.responseHeight);
  const nudgeResponseHeight = useLayout((s) => s.nudgeResponseHeight);

  /* ── Save ─────────────────────────────────────────────────────────── */
  const onSave = async () => {
    if (!isSavedRequest || !active) {
      toast.info('Drag this into a collection to save it (Save As coming soon)');
      return;
    }
    try {
      setSavingState('saving');
      await updateRequestSvc(active.id, {
        method,
        url: { raw: url } as any,
        headers: headers.filter((h) => h.enabled && h.key).map((h) => ({ key: h.key, value: h.value, enabled: true, description: h.description })),
        body: buildBodyPayload(body),
        auth: { type: (auth.type === 'noauth' ? 'NONE' : (auth.type || 'NONE').toUpperCase()), ...auth.config } as any,
        preRequestScript: preScript,
        testScript,
      } as any);
      setDirty(false);
      setSavingState('saved');
      if (active?.id) setMeta(active.id, { dirty: false });
    } catch (e: any) {
      setSavingState('idle');
      toast.error(e.message || 'Save failed');
    }
  };

  /* ── Autosave timer ──────────────────────────────────────────────── */
  const autosaveTimer = useRef<number | null>(null);
  const [autosaveCountdown, setAutosaveCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (!autoSaveEnabled || !dirty || !isSavedRequest) {
      if (autosaveTimer.current) { clearInterval(autosaveTimer.current); autosaveTimer.current = null; }
      setAutosaveCountdown(null);
      return;
    }
    let remaining = Math.ceil(autoSaveDelayMs / 1000);
    setAutosaveCountdown(remaining);
    autosaveTimer.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(autosaveTimer.current!);
        autosaveTimer.current = null;
        setAutosaveCountdown(null);
        void onSave();
      } else {
        setAutosaveCountdown(remaining);
      }
    }, 1000);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, autoSaveEnabled, autoSaveDelayMs, isSavedRequest, method, url, headers, body, auth, preScript, testScript]);

  /* ── Send (per-tab AbortController, never cancels on tab switch) ─── */
  const onSend = async (mode: 'normal' | 'stream' = 'normal') => {
    if (!url.trim()) { toast.error('Enter a URL'); return; }
    const tabId = active?.id ?? 'default';
    /* If a previous request from THIS tab is still running, abort it. */
    inflightRef.current.get(tabId)?.abort();
    const ctrl = new AbortController();
    inflightRef.current.set(tabId, ctrl);
    useRunsStore.getState().startSend(tabId);
    expandResponse();
    try {
      const effectiveUrl = url;
      /* If the user disabled the auth-derived row in Headers tab, skip the
       * auth section entirely so the backend doesn't re-add it. */
      const authDerived = deriveAuthHeaders(auth);
      const allAuthDisabled =
        authDerived.length > 0 && authDerived.every((r) => disabledAuthHeaderIds.has(r.id));
      const sendAuth = allAuthDisabled
        ? { type: 'NONE' as const }
        : { type: (auth.type === 'noauth' ? 'NONE' : (auth.type || 'NONE').toUpperCase()), ...auth.config };
      const payload: any = {
        method,
        url: { raw: effectiveUrl },
        headers: headers.filter((h) => h.enabled && h.key).map((h) => ({ key: h.key, value: h.value, enabled: true, description: h.description })),
        body: buildSendBodyPayload(body),
        auth: sendAuth,
        preRequestScript: preScript,
        testScript,
        workspaceId: ws?.id,
        // Runtime variable resolution needs the active environment id so
        // the backend's envResolver can stitch the (org GLOBAL → workspace →
        // env) chain. Without this, adhoc Send bypassed env vars and only
        // resolved org-global tokens. `activeEnvId` is picked from the
        // header-strip env-picker (mirrored in settings store).
        environmentId: useSettings.getState().activeEnvId ?? undefined,
      };
      // GraphQL requests are always POST-with-JSON over the wire. Force
      // method + content-type header so the executor sends the
      // operation as a plain HTTP JSON body (`{ query, variables }`)
      // without the user having to set those manually. We do this only
      // on SEND — the persisted save keeps the canonical body.mode='GRAPHQL'.
      if (body.mode === 'graphql') {
        payload.method = 'POST';
        const hasCT = (payload.headers as any[]).some((h) => String(h.key).toLowerCase() === 'content-type');
        if (!hasCT) {
          payload.headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
        }
      }
      if (mode === 'stream') {
        /* Live trace via SSE — works for both adhoc and saved requests
         * because the BFF exposes /adhoc/execute/stream that takes a
         * full payload (we don't need to know the request's stored id). */
        useStreamStore.getState().start(tabId, url.startsWith('https://'));
        await executeStream(payload, {
          onPhase: (e) => useStreamStore.getState().phase(tabId, e),
          onMeta:  (e) => useStreamStore.getState().meta(tabId, e.network ?? {}),
          onError: (e) => useStreamStore.getState().error(tabId, e),
          onDone:  (final) => {
            useStreamStore.getState().done(tabId);
            setResult(final);
          },
        }, ctrl.signal);
      } else {
        /* Normal execute — wipe any prior streaming artefacts so the
         * Live stepper / Execution Pipeline doesn't show stale phases. */
        useStreamStore.getState().clear(tabId);
        /* New send → if chatbot was in error mode for the previous run,
         * reset it so the user isn't haunted by stale analysis. */
        if (useChatbot.getState().mode === 'error') useChatbot.getState().clearError();
        const res = isSavedRequest
          ? await executeRequest(active!.id, payload, { signal: ctrl.signal })
          : await adhocExecute(payload as any, { signal: ctrl.signal });
        setResult(res);
        // Capture this run into the global history store so the History
        // page (and the sidebar history list) can replay it later. We
        // ship the FULL request snapshot — not just the response — so
        // "Try" can re-execute without going back to the server.
        useRunHistoryStore.getState().push(
          'request',
          {
            tabId,
            requestId: isSavedRequest ? active!.id : undefined,
            name: active?.name ?? url,
            method, url,
            headers, params, auth, body, preScript, testScript,
          },
          res,
        );
        /* Auto-trigger chatbot's error analyzer on 4xx/5xx responses OR
         * on execution-pipeline failures (DNS miss, TLS fail, connection
         * refused, unresolved var …). The server emits `status: 'FAILED'`
         * + populates `error` / phase-level `error` for those — we surface
         * both so the Yes/No prompt always shows when the user needs it. */
        const statusCode = res?.response?.statusCode ?? res?.network?.statusCode;
        const failedPhase = Array.isArray((res as any)?.phases)
          ? (res as any).phases.find((p: any) => p.status === 'failed' || p.ok === false)
          : null;
        const execFailed =
          (res as any)?.status === 'FAILED' ||
          !!(res as any)?.error ||
          !!failedPhase;
        if ((statusCode && statusCode >= 400) || execFailed) {
          const headersAsKv = (res.response?.headers ?? []).map((h: any) =>
            Array.isArray(h) ? { name: h[0], value: h[1] } : { name: h?.name ?? h?.key ?? '', value: h?.value ?? '' });
          const errObj = (res as any)?.error;
          const errMsg = errObj?.message || failedPhase?.error || res.response?.statusText || 'Request failed';
          useChatbot.getState().triggerError({
            method: payload.method,
            url: typeof payload.url === 'string' ? payload.url : (payload.url as any)?.raw,
            statusCode: statusCode && statusCode > 0 ? statusCode : undefined,
            statusText: res.response?.statusText ?? errObj?.kind ?? failedPhase?.name ?? '',
            errorMessage: (statusCode && statusCode >= 400) ? undefined : errMsg,
            durationMs: res.totalMs ?? 0,
            headers: headersAsKv,
            body: typeof res.response?.body === 'string' ? res.response.body : JSON.stringify(res.response?.body ?? '').slice(0, 4000),
            location: 'Request Builder',
          });
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        toast.info('Request cancelled');
        setResult(null);
      } else {
        const errMsg = e?.response?.data?.message || e?.message || String(e) || 'Request failed';
        toast.error(errMsg);
        useChatbot.getState().triggerError({
          method,
          url,
          errorMessage: errMsg,
          location: 'Request Builder',
        });
        /* Synthesise a failure ExecutionResult so the response pane shows
         * the error message instead of reverting to "Press Send". */
        setResult({
          runId: `local-${Date.now()}`,
          status: 'FAILED',
          totalMs: 0,
          finalUrl: url,
          method,
          sentHeaders: [],
          sentBody: '',
          network: { statusCode: 0, sizeBytes: 0 },
          phases: [],
          response: {
            statusCode: 0,
            statusText: 'Request failed',
            headers: [],
            body: '',
            sizeBytes: 0,
            contentType: '',
          },
          error: { kind: e?.name || 'NetworkError', message: errMsg },
          runAt: new Date().toISOString(),
        } as any);
      }
    } finally {
      useRunsStore.getState().finishSend(tabId);
      inflightRef.current.delete(tabId);
    }
  };
  const onCancelRequest = () => {
    inflightRef.current.get(active?.id ?? 'default')?.abort();
  };

  /* ── New-as-sibling: create new request in same parent location ──── */
  const openRequest = useRequests((s) => s.openRequest);
  const onNewSibling = async () => {
    /* If active request belongs to a saved collection, create a real
     * empty request via backend so it shows up in the sidebar tree. */
    if (active?.collectionId) {
      try {
        const created = await createRequest(active.collectionId, {
          name: 'Untitled',
          method: 'GET',
          folderId: active.folderId ?? null,
          url: { raw: '' } as any,
          headers: [],
          auth: { type: 'none' } as any,
          body: { mode: 'none' } as any,
        } as any);
        openRequest({
          id: created.id,
          method: (created.method || 'GET') as any,
          name: created.name || 'Untitled',
          url: created.url?.raw ?? '',
          workspaceId: ws?.id,
          collectionId: created.collectionId,
          folderId: created.folderId ?? null,
          dirty: false,
        });
        /* Refresh sidebar listings (collection root + folder children). */
        qc.invalidateQueries({ queryKey: ['requests', active.collectionId] });
        qc.invalidateQueries({ queryKey: ['requests', 'folder', active.folderId] });
        qc.invalidateQueries({ queryKey: ['requests'] });
        toast.success('New request created');
      } catch (e: any) {
        toast.error(e?.message || 'Could not create request');
        newUntitled({ workspaceId: ws?.id, collectionId: active?.collectionId, folderId: active?.folderId });
      }
    } else {
      newUntitled();
    }
  };

  // Wire user-rebindable Send + Save shortcuts. Bindings are read from
  // settings.shortcuts and listened to globally by the hook itself.
  useShortcut('send-request', useCallback(() => { if (!sending) void onSend('normal'); }, [sending]));
  useShortcut('save-request', useCallback(() => { void onSave(); }, []));

  // Right-click context menu for open request tabs.
  const tabsCtx = useRowContextMenu();
  const buildTabContextItems = (tabId: string, tabName: string): RowContextItem[] => [
    { groupLabel: tabName.length > 24 ? tabName.slice(0, 24) + '…' : tabName },
    { icon: Pencil, label: 'Rename',  onClick: () => { setRenamingId(tabId); setRenameDraft(tabName); } },
    { icon: Copy,   label: 'Duplicate tab', onClick: () => { void onNewSibling(); } },
    { icon: Save,   label: 'Save',    onClick: () => { setActive(tabId); void onSave(); } },
    { separator: true },
    { icon: X,      label: 'Close tab', onClick: () => closeReq(tabId) },
    { icon: X,      label: 'Close other tabs', onClick: () => { open.filter(o => o.id !== tabId).forEach(o => closeReq(o.id)); } },
    { separator: true },
    { icon: Trash2, label: 'Delete request', destructive: true, onClick: () => toast.info('Delete from sidebar — right-click the request in the collection tree') },
  ];

  return (
    <div data-testid="request-builder" className="flex h-full flex-col">
      {/* Open request tabs — fixed-size tabs, scrollable container */}
      <div className="flex h-9 items-center border-b border-border bg-surface">
        
        <div data-testid="open-tabs-scroll" className="ml-1 flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap px-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border">
          {open.map((t) => (
            <button
              key={t.id}
              data-testid={`open-tab-${t.id}`}
              onClick={() => setActive(t.id)}
              onContextMenu={(e) => { setActive(t.id); tabsCtx.openAt(e, buildTabContextItems(t.id, t.name)); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenamingId(t.id);
                setRenameDraft(t.name);
              }}
              title="Double-click to rename"
              className={cn(
                'group flex h-7 w-[160px] shrink-0 items-center gap-1.5 rounded-t-md border-x border-t px-2 text-xs',
                activeId === t.id
                  ? 'border-border bg-probestack-bg text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              <span className={cn('shrink-0 font-mono text-[10px] font-bold', MC[t.method])}>{t.method}</span>
              {renamingId === t.id ? (
                <input
                  autoFocus
                  data-testid={`tab-rename-${t.id}`}
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => void commitRename(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void commitRename(t.id); }
                    else if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
                  }}
                  className="min-w-0 flex-1 rounded border border-primary/60 bg-elevated px-1 text-xs text-text-primary outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-left">{t.name}</span>
              )}
              {t.dirty && <span title="Unsaved changes" className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" data-testid={`tab-dirty-${t.id}`} />}
              <X
                className="h-3 w-3 shrink-0 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); closeReq(t.id); }}
              />
            </button>
          ))}
        </div>
        {tabsCtx.portal}
        <Tooltip content="New request (sibling of active)">
          <button
            data-testid="new-request-tab"
            onClick={onNewSibling}
            className="ml-2 flex h-7 shrink-0 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-text-secondary transition-colors hover:border-primary/60 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </Tooltip>
      </div>

      {/* URL row */}
      <div className="flex items-center gap-2 border-b border-border bg-surface p-2">
        <MethodSelectCustom method={method} onChange={setMethodDirty} />
        <VariableInput
          value={url}
          onChange={onUrlChange}
          placeholder="Enter request URL — use {{variable}} for env values"
          testId="url-input"
          mode="boxed"
          mono
          onSubmit={() => { if (!sending) void onSend('normal'); }}
        />
        {sending ? (
          <Button variant="destructive" size="md" onClick={onCancelRequest} data-testid="cancel-btn" className="shrink-0 whitespace-nowrap">
            <X className="h-4 w-4" /> Cancel
          </Button>
        ) : (
          <SendSplitButton onSend={onSend} />
        )}
        <SaveButton
          onSave={onSave}
          dirty={dirty}
          state={savingState}
          autosaveCountdown={autosaveCountdown}
          autoSaveEnabled={autoSaveEnabled}
        />
      </div>

      {/* Primary editor tabs */}
      <div className="flex h-9 items-center gap-1 border-b border-border bg-surface px-2">
        {TABS.map((t) => {
          const count = countForTab(t, { params, headers, body, auth });
          return (
            <button
              key={t}
              data-testid={`tab-${t.toLowerCase().replace(/[^a-z]/g, '')}`}
              onClick={() => setTab(t)}
              className={cn(
                'relative h-full px-3 text-xs font-semibold transition-colors',
                tab === t ? 'text-primary' : 'text-text-primary/80 hover:text-text-primary',
              )}
            >
              {t}
              {count !== null && count > 0 && <span className="ml-1 text-[10px] text-text-muted">({count})</span>}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Editor body */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto bg-probestack-bg p-4">
          {tab === 'Params' && (
            <KVTable
              rows={params}
              onChange={onParamsChange}
              showDescription={showParamDesc}
              onToggleDescription={setShowParamDesc}
              testIdPrefix="params"
            />
          )}
          {tab === 'Headers' && (
            <KVTable
              rows={headers}
              onChange={setHeadersDirty}
              autoRows={DEFAULT_AUTO_HEADERS}
              derivedRows={
                /* Project the Auth tab into toggleable rows. The user can
                 * tick / untick AND inline-edit each row right here without
                 * leaving the Headers tab — exactly like Postman. The
                 * credentials still live in the Auth tab; edits made here
                 * are parsed back via parseAuthRowEdit so both tabs stay
                 * in lockstep. */
                deriveAuthHeaders(auth).map((r) => ({
                  ...r,
                  enabled: !disabledAuthHeaderIds.has(r.id),
                  badge: 'Auth',
                }))
              }
              onToggleDerived={(rowId, enabled) => {
                setDisabledAuthHeaderIds((prev) => {
                  const next = new Set(prev);
                  if (enabled) next.delete(rowId); else next.add(rowId);
                  return next;
                });
                markDirty();
              }}
              onEditDerived={(rowId, newValue) => {
                const next = parseAuthRowEdit(rowId, newValue, auth);
                if (next) { setAuth(next); markDirty(); }
              }}
              showDescription={showHeaderDesc}
              onToggleDescription={setShowHeaderDesc}
              testIdPrefix="headers"
            />
          )}
          {tab === 'Body'    && (
            <BodyEditor
              value={body}
              onChange={(b) => {
                /* GraphQL is POST-only over HTTP — auto-bump the method
                   so the body section actually renders (the body editor
                   greys itself out on GET/HEAD/etc.). */
                if (b.mode === 'graphql' && (method === 'GET' || method === 'HEAD')) {
                  setMethodDirty('POST');
                }
                setBodyDirty(b);
              }}
              method={method}
              url={url}
            />
          )}
          {tab === 'Auth'    && <AuthEditor value={auth} onChange={setAuthDirty} />}
          {tab === 'Pre-request Script' && <ScriptEditor kind="prerequest" value={preScript} onChange={setPreScriptDirty} />}
          {tab === 'Tests'              && <ScriptEditor kind="tests"      value={testScript} onChange={setTestScriptDirty} />}
          {tab === 'Comments'           && activeId && (
            <div className="h-full overflow-auto p-4">
              <CollabCommentsPanel entityType="request" entityId={activeId} className="mx-auto max-w-2xl" />
            </div>
          )}
        </div>

        {responseExpanded && (
          <>
            <ResizeHandle direction="vertical" onResize={nudgeResponseHeight} invert testId="response-resize" />
            <ResponsePanel
              height={responseHeight}
              onClose={collapseResponse}
              result={result}
              sending={sending}
              tabId={active?.id}
              requestId={isSavedRequest ? active?.id : undefined}
            />
          </>
        )}
        {!responseExpanded && (
          <div className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-3 text-[11px] text-text-secondary">
            <div className="flex items-center gap-3">
              <span className="font-medium text-text-primary">Response</span>
              {result?.network?.statusCode != null && (
                <span className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[10px]',
                  result.network.statusCode < 400 ? 'bg-success-muted text-success' : 'bg-red-500/10 text-red-500',
                )}>
                  {result.network.statusCode}
                </span>
              )}
              {result?.totalMs != null && (
                <span className="text-[10px] text-text-muted">{result.totalMs} ms</span>
              )}
              {!result && !sending && (
                <span className="text-[10px] text-text-muted">No response yet — send a request.</span>
              )}
              {sending && <span className="text-[10px] text-text-muted">Sending…</span>}
            </div>
            <button onClick={expandResponse} data-testid="response-expand" className="flex items-center gap-1 text-text-muted hover:text-text-primary">
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MethodSelect = ({ method, onChange }: { method: Method; onChange: (m: Method) => void }) => (
  <Select
    value={method}
    onChange={(v) => onChange(v as Method)}
    options={METHODS.map((m) => ({ value: m, label: m }))}
    testId="method-select"
    className={cn(
      'h-9 w-24 border-2 border-warning/60 bg-probestack-bg font-mono text-sm font-bold',
      MC[method],
    )}
  />
);
const MethodSelectCustom = MethodSelect;

/* SaveButton — dirty-aware: idle/saving/saved + autosave countdown chip. */
const SaveButton = ({
  onSave, dirty, state, autosaveCountdown, autoSaveEnabled,
}: {
  onSave: () => void;
  dirty: boolean;
  state: 'idle' | 'saving' | 'saved';
  autosaveCountdown: number | null;
  autoSaveEnabled: boolean;
}) => {
  const disabled = !dirty || state === 'saving';
  const label = state === 'saving' ? 'Saving…' : state === 'saved' && !dirty ? 'Saved' : 'Save';
  const tooltipText = !dirty && state === 'idle' ? 'No changes to save'
    : !dirty && state === 'saved' ? 'All changes saved'
    : state === 'saving' ? 'Saving…'
    : autoSaveEnabled && autosaveCountdown !== null ? `Auto-save in ${autosaveCountdown}s — click to save now`
    : 'Save changes';
  return (
    <Tooltip content={tooltipText}>
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="md"
          onClick={onSave}
          disabled={disabled}
          data-testid="save-btn"
          className={cn('whitespace-nowrap', disabled && 'cursor-not-allowed opacity-60')}
        >
          {state === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>{label}</span>
        </Button>
        {dirty && autoSaveEnabled && autosaveCountdown !== null && (
          <span
            data-testid="autosave-countdown"
            className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/40 bg-primary-muted px-1.5 font-mono text-[10px] text-primary"
          >
            <Clock className="h-3 w-3" />{autosaveCountdown}s
          </span>
        )}
      </span>
    </Tooltip>
  );
};

/* ─── payload helpers ─── */
const buildBodyPayload = (b: RequestBody): any => {
  /* Map UI body shape → backend `CanonicalBody` enum + field names.
     Backend modes: NONE | RAW_JSON | RAW_TEXT | RAW_XML | FORM_URLENCODED | FORM_DATA | BINARY | GRAPHQL */
  if (b.mode === 'none' || !b.mode) return { mode: 'NONE' };
  if (b.mode === 'raw') {
    const lang = (b.language || 'json').toLowerCase();
    const mode = lang === 'xml' ? 'RAW_XML' : lang === 'text' ? 'RAW_TEXT' : 'RAW_JSON';
    const contentType = lang === 'xml' ? 'application/xml' : lang === 'text' ? 'text/plain' : 'application/json';
    return { mode, raw: b.raw || '', contentType };
  }
  if (b.mode === 'form-data') {
    return {
      mode: 'FORM_DATA',
      formFields: (b.formData ?? []).filter((r) => r.enabled && r.key).map((r) => ({
        key: r.key,
        type: r.type,
        value: r.type === 'text' ? r.value : (typeof r.value === 'object' ? (r.value as any).name : ''),
        fileRef: r.type === 'file' && typeof r.value === 'object' && (r.value as any).kind === 'forgeq' ? (r.value as any).id : undefined,
        enabled: true,
      })),
    };
  }
  if (b.mode === 'x-www-form-urlencoded') {
    return {
      mode: 'FORM_URLENCODED',
      formFields: (b.urlEncoded ?? []).filter((r) => r.enabled && r.key).map((r) => ({
        key: r.key, value: r.value, type: 'text', enabled: true,
      })),
    };
  }
  if (b.mode === 'graphql') {
    // Persist the GraphQL operation alongside the canonical mode flag.
    // The Java request-mgmt-svc maps mode='GRAPHQL' through the
    // CanonicalBody discriminator and round-trips body.graphql verbatim,
    // so the only thing the UI needs to send is the { query, variables }
    // tuple. Variables stays a *string* so the user can keep it raw and
    // we never lose comments or formatting.
    return {
      mode: 'GRAPHQL',
      graphql: {
        query:     b.graphql?.query     ?? '',
        variables: b.graphql?.variables ?? '',
      },
      contentType: 'application/json',
    };
  }
  // Binary is the only mode the UI doesn't surface yet; default to NONE
  // so the backend never receives an invalid enum.
  return { mode: 'NONE' };
};

/**
 * Build the body payload used on SEND — the executor needs an HTTP-
 * ready JSON for GraphQL, not the canonical persisted shape. We map
 * mode='graphql' to RAW_JSON with `{ query, variables }` so the
 * downstream HTTP client sends the operation exactly as a GraphQL
 * server expects (POST application/json).
 */
const buildSendBodyPayload = (b: RequestBody): any => {
  if (b.mode !== 'graphql') return buildBodyPayload(b);
  const variablesRaw = (b.graphql?.variables ?? '').trim();
  let variablesParsed: any = undefined;
  if (variablesRaw) {
    try { variablesParsed = JSON.parse(variablesRaw); }
    catch { /* keep undefined — server will see no variables rather than malformed JSON. */ }
  }
  const wire: any = { query: b.graphql?.query ?? '' };
  if (variablesParsed !== undefined) wire.variables = variablesParsed;
  return {
    mode: 'RAW_JSON',
    raw: JSON.stringify(wire),
    contentType: 'application/json',
  };
};
const describeFileValue = (r: FormDataRow) => {
  const v = r.value as FileValue;
  if (v.kind === 'forgeq') return { forgeqFileId: v.id, name: v.name };
  if (v.kind === 'local')  return { localFile: v.name, size: v.size };
  return null;
};

const normalizeAuth = (t: any): AuthType => {
  const s = String(t || 'noauth').toLowerCase();
  const map: Record<string, AuthType> = {
    none: 'noauth', noauth: 'noauth', apikey: 'apikey', 'api-key': 'apikey',
    bearer: 'bearer', basic: 'basic', digest: 'digest', oauth1: 'oauth1',
    oauth2: 'oauth2', hawk: 'hawk', awsv4: 'awsv4', aws: 'awsv4', ntlm: 'ntlm', inherit: 'inherit',
  };
  return map[s] ?? 'noauth';
};

const countForTab = (t: Tab, s: {
  params: KVRow[]; headers: KVRow[]; body: RequestBody; auth: AuthConfig;
}): number | null => {
  if (t === 'Params')  return s.params.filter((r) => r.enabled && r.key).length;
  if (t === 'Headers') return s.headers.filter((r) => r.enabled && r.key).length;
  /* Body, Auth, Pre-request Script & Tests never show counts (Postman-parity). */
  return null;
};

/* ─── URL ↔ params helpers ─── */
const parseUrlParams = (u: string): KVRow[] => {
  const q = u.split('?')[1] ?? '';
  if (!q) return [];
  return q.split('&').filter(Boolean).map((kv, i) => {
    const [k, v = ''] = kv.split('=');
    return { id: `p_${i}`, key: decodePreserveVars(k || ''), value: decodePreserveVars(v || ''), enabled: true };
  });
};

/* decodeURIComponent that doesn't choke on raw `{{var}}` tokens. */
const decodePreserveVars = (s: string): string => {
  try { return decodeURIComponent(s); } catch { return s; }
};
const rebuildUrl = (u: string, rows: KVRow[]) => {
  const base = u.split('?')[0];
  const q = rows.filter((r) => r.enabled && r.key).map((r) => `${encodePreserveVars(r.key)}=${encodePreserveVars(r.value)}`).join('&');
  return q ? `${base}?${q}` : base;
};

/* encodeURIComponent that LEAVES `{{var}}` tokens raw — Postman parity. */
const encodePreserveVars = (s: string): string => {
  if (!s) return '';
  const re = /\{\{\s*[\w.-]+\s*\}\}/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out += encodeURIComponent(s.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  if (last < s.length) out += encodeURIComponent(s.slice(last));
  return out;
};

/* ─── Response panel moved to ./parts/ResponsePanel.tsx ─── */

/* SendSplitButton — main "Send" + a small chevron dropdown that lets
 * users pick "Send (Streaming)" to enable live execution tracing in
 * the Debug Info tab. We use a simple click-outside popover instead
 * of a full Radix DropdownMenu to keep the component cheap. */
const SendSplitButton = ({ onSend }: { onSend: (mode: 'normal' | 'stream') => void | Promise<void> }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="relative shrink-0">
      <div className="flex h-9 overflow-hidden rounded-md">
        <button
          data-testid="send-btn"
          onClick={() => onSend('normal')}
          className="flex items-center gap-1.5 bg-primary px-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
        >
          <Send className="h-4 w-4" /> Send
        </button>
        <Tooltip content="Send options">
          <button
            data-testid="send-options-btn"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            className="flex items-center border-l border-primary-hover bg-primary px-1.5 text-text-inverse transition-colors hover:bg-primary-hover"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      {open && (
        <div data-testid="send-options-menu" className="absolute right-0 top-10 z-30 w-56 rounded-md border border-border bg-elevated p-1 text-text-primary shadow-xl">
          <SendOption label="Send" hint="Normal execution. Returns when complete." onClick={() => onSend('normal')} testId="send-option-normal" />
          <SendOption label="Send (Streaming)" hint="Trace each phase live in Debug Info tab." onClick={() => onSend('stream')} testId="send-option-stream" />
        </div>
      )}
    </div>
  );
};

const SendOption = ({ label, hint, onClick, testId }: { label: string; hint: string; onClick: () => void; testId: string }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-primary-muted"
  >
    <span className="text-xs font-semibold">{label}</span>
    <span className="text-[10px] text-text-muted">{hint}</span>
  </button>
);

