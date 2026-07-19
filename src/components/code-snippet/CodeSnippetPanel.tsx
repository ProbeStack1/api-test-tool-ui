/**
 * CodeSnippetPanel — right-rail "Snippet" tab.
 *
 *   - 11 manual generators (cURL, Postman CLI, fetch, jQuery, axios, node-http,
 *     python-requests, HTTPie, Java OkHttp / Unirest / HttpURLConnection).
 *   - Editable ONLY for cURL and Postman CLI — parses back into the shared
 *     request-draft store so the RequestBuilder updates live.
 *   - Read-only for all other languages.
 *   - Syntax highlighting via `react-syntax-highlighter` (Prism + One-Dark).
 *   - Editable variant layers a transparent <textarea> on top of the
 *     highlighter so the user can type while the code is colourised.
 *   - No IDE chrome: NO gutter, NO line numbers, NO active-line highlight —
 *     matches the user's reference image.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
// `react-syntax-highlighter` ships without TS typings for its deep
// import paths. We use the imports at runtime and stub the types here.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no types
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no types
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useQuery } from '@tanstack/react-query';
import { useRequestDraftStore, type DraftKV, type DraftSnapshot } from '@/stores/requestDraft.store';
import { useSettings } from '@/stores/settings.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { listEnvironmentsFull } from '@/services/environment.service';
import { buildVarMap, substituteDeep } from '@/utils/resolveVarsLocal';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import { AppIcon } from '@/components/icons/AppIcons';
import { cn } from '@/utils/cn';
// Robust cURL parser shared with the URL bar. Handles --data-binary,
// --data-urlencode, -F, -u, line continuations, ANSI-C quoting, etc.
// The previous inline regex parser was kept ONLY as a fallback for very
// degenerate input, but we now route the happy path through the shared
// utility for parity with paste-into-URL-bar.
import { parseCurl as parseCurlRobust } from '@/utils/parseCurl';

const LS_KEY = 'forgeq.snippetTarget.v1';

/* =========================================================================
 *  Language registry
 * ========================================================================= */
interface Lang { value: string; label: string; syntax: string; editable?: boolean }
const LANGS: Lang[] = [
  { value: 'curl',                   label: 'cURL',                       syntax: 'bash',        editable: true },
  { value: 'postman',                label: 'Postman CLI',                syntax: 'bash',        editable: true },
  { value: 'javascript-fetch',       label: 'JavaScript · fetch',         syntax: 'javascript' },
  { value: 'javascript-jquery',      label: 'JavaScript · jQuery',        syntax: 'javascript' },
  { value: 'node-axios',             label: 'Node.js · axios',            syntax: 'javascript' },
  { value: 'node-http',              label: 'Node.js · native http',      syntax: 'javascript' },
  { value: 'python',                 label: 'Python · requests',          syntax: 'python' },
  { value: 'httpie',                 label: 'HTTPie',                     syntax: 'bash' },
  { value: 'java-okhttp',            label: 'Java · OkHttp',              syntax: 'java' },
  { value: 'java-unirest',           label: 'Java · Unirest',             syntax: 'java' },
  { value: 'java-httpurlconnection', label: 'Java · HttpURLConnection',   syntax: 'java' },
];

/* =========================================================================
 *  Query-string helper
 * ========================================================================= */
const parseQueryString = (url: string): DraftKV[] => {
  const qIx = url.indexOf('?');
  if (qIx === -1) return [];
  const qs = url.slice(qIx + 1);
  if (!qs) return [];
  return qs.split('&').map((pair) => {
    const eq = pair.indexOf('=');
    let k = eq === -1 ? pair : pair.slice(0, eq);
    let v = eq === -1 ? '' : pair.slice(eq + 1);
    try { k = decodeURIComponent(k); } catch { /* noop */ }
    try { v = decodeURIComponent(v); } catch { /* noop */ }
    return { name: k, value: v, enabled: true };
  });
};

/* =========================================================================
 *  Parsers (cURL / Postman CLI) — convert edited snippet back to draft
 *
 *  For cURL we now delegate to the shared `parseCurlRobust` from
 *  `@/utils/parseCurl`. That parser supports --data-binary,
 *  --data-urlencode, -F multipart, -u basic-auth, line continuations,
 *  ANSI-C quoted strings, etc., matching the URL-bar paste behaviour.
 *  The previous inline regex one-liner has been removed.
 * ========================================================================= */
const parseCurl = (s: string): Partial<DraftSnapshot> | null => {
  if (!s.trim()) return null;
  const res = parseCurlRobust(s);
  if (!res) return null;
  return res.draft;
};

const parsePostmanCli = (s: string): Partial<DraftSnapshot> | null => {
  if (!s.trim()) return null;
  const cleaned = s.replace(/\\\s*\n/g, ' ').trim();
  const mm = cleaned.match(/--method\s+([A-Z]+)/i);
  const um = cleaned.match(/--url\s+['"]([^'"]+)['"]/);
  if (!um) return null;
  const method = mm ? mm[1].toUpperCase() : 'GET';
  const url = um[1];

  const headers: DraftKV[] = [];
  const hdrRx = /--header\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = hdrRx.exec(cleaned)) !== null) {
    const colon = m[1].indexOf(':');
    if (colon > 0) headers.push({ name: m[1].slice(0, colon).trim(), value: m[1].slice(colon + 1).trim(), enabled: true });
  }

  const bodyM = cleaned.match(/--body\s+['"]([\s\S]+?)['"]\s*(?:\\|$)/);
  return {
    method, url: url.split('?')[0],
    queryParams: parseQueryString(url),
    headers,
    bodyKind: bodyM ? 'text' : 'none',
    bodyText: bodyM?.[1],
  };
};

/* =========================================================================
 *  Generators (one per target)
 *
 *  All take the same tuple (method, url, queryParams, enabledHeaders,
 *  body) so the switch in `generate()` stays tiny.
 * ========================================================================= */
const buildFullUrl = (url: string, q: DraftKV[]): string => {
  const valid = q.filter((p) => p.name?.trim() && (p.enabled ?? true));
  if (valid.length === 0) return url;
  const qs = valid.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value ?? '')}`).join('&');
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const gCurl = (
  m: string,
  u: string,
  q: DraftKV[],
  h: DraftKV[],
  b: string,
  bodyKind: DraftSnapshot['bodyKind'],
  bodyForm?: DraftKV[]
): string => {
  if (!u) return '';
  let out = `curl -X ${m} '${buildFullUrl(u, q)}'`;
  h.forEach((hd) => { out += ` \\\n  -H '${hd.name}: ${hd.value ?? ''}'`; });

if (bodyKind === 'multipart' && bodyForm && bodyForm.length) {
  // Add -F for each field
  bodyForm.forEach((f) => {
    out += ` \\\n  -F '${f.name}=${f.value}'`;
  });
} else if (bodyKind === 'form-urlencoded' && bodyForm && bodyForm.length) {
  // Build urlencoded string from bodyForm
  const urlencoded = bodyForm
    .map((f) => `${encodeURIComponent(f.name)}=${encodeURIComponent(f.value)}`)
    .join('&');
  out += ` \\\n  -d '${urlencoded.replace(/'/g, "'\\''")}'`;
} else if ((bodyKind === 'json' || bodyKind === 'raw' || bodyKind === 'text') && b) {
  out += ` \\\n  -d '${b.replace(/'/g, "'\\''")}'`;
}
  return out;
};

const gPostman = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `postman request send --method ${m} --url '${buildFullUrl(u, q)}'`;
  h.forEach((hd) => { out += ` \\\n  --header '${hd.name}: ${hd.value ?? ''}'`; });
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) out += ` \\\n  --body '${b.replace(/'/g, "'\\''")}'`;
  return out;
};

const gFetch = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  const hdrs: Record<string, string> = {};
  h.forEach((hd) => { hdrs[hd.name] = hd.value ?? ''; });
  const opts: any = { method: m, headers: hdrs };
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) {
    opts.body = b;
    if (!hdrs['Content-Type']) hdrs['Content-Type'] = 'application/json';
  }
  return `fetch('${buildFullUrl(u, q)}', ${JSON.stringify(opts, null, 2)})\n  .then(r => r.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
};

const gJQuery = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  const hdrs: Record<string, string> = {};
  h.forEach((hd) => { hdrs[hd.name] = hd.value ?? ''; });
  const dataProp = (['POST', 'PUT', 'PATCH'].includes(m) && b) ? `,\n  data: ${b}` : '';
  return `$.ajax({\n  url: '${buildFullUrl(u, q)}',\n  type: '${m}',\n  headers: ${JSON.stringify(hdrs, null, 2)}${dataProp}\n});`;
};

const gNodeAxios = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `const axios = require('axios');\n\nconst config = {\n  method: '${m}',\n  url: '${buildFullUrl(u, q)}',\n  headers: {\n`;
  h.forEach((hd) => { out += `    '${hd.name}': '${hd.value ?? ''}',\n`; });
  out += `  },\n`;
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) out += `  data: ${b},\n`;
  out += `};\n\naxios(config)\n  .then(r => console.log(r.data))\n  .catch(err => console.error(err));`;
  return out;
};

const gNodeHttp = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let parsed: URL;
  try { parsed = new URL(buildFullUrl(u, q)); } catch { return ''; }
  const mod = parsed.protocol === 'https:' ? 'https' : 'http';
  let out = `const ${mod} = require('${mod}');\n\nconst options = {\n  hostname: '${parsed.hostname}',\n  port: ${parsed.port || (mod === 'https' ? 443 : 80)},\n  path: '${parsed.pathname + parsed.search}',\n  method: '${m}',\n  headers: {\n`;
  h.forEach((hd) => { out += `    '${hd.name}': '${hd.value ?? ''}',\n`; });
  out += `  }\n};\n\n`;
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) {
    out += `const req = ${mod}.request(options, res => { let d=''; res.on('data', c => d+=c); res.on('end', () => console.log(d)); });\nreq.write(${JSON.stringify(b)});\nreq.end();`;
  } else {
    out += `${mod}.request(options, res => { let d=''; res.on('data', c => d+=c); res.on('end', () => console.log(d)); }).end();`;
  }
  return out;
};

const gPython = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  const full = buildFullUrl(u, q);
  let out = `import requests\n\nurl = "${full}"\nheaders = {\n`;
  h.forEach((hd) => { out += `    "${hd.name}": "${hd.value ?? ''}",\n`; });
  out += `}\n`;
  if (b) out += `payload = ${b}\n`;
  out += `\n`;
  const lower = m.toLowerCase();
  if (['post', 'put', 'patch'].includes(lower) && b) {
    out += `response = requests.${lower}(url, headers=headers, json=payload)\n`;
  } else if (['get', 'delete'].includes(lower)) {
    out += `response = requests.${lower}(url, headers=headers)\n`;
  } else {
    out += `response = requests.request("${m}", url, headers=headers${b ? ', json=payload' : ''})\n`;
  }
  out += `\nprint(response.status_code)\nprint(response.json())`;
  return out;
};

const gHttpie = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `http ${m.toLowerCase()} "${buildFullUrl(u, q)}"`;
  h.forEach((hd) => { out += ` "${hd.name}:${hd.value ?? ''}"`; });
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) out += ` <<< '${b.replace(/'/g, "'\\''")}'`;
  return out;
};

const gOkHttp = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `// com.squareup.okhttp3:okhttp:4.12.0\nimport okhttp3.*;\nimport java.io.IOException;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        OkHttpClient client = new OkHttpClient();\n\n        MediaType type = MediaType.parse("application/json");\n        RequestBody reqBody = ${b ? `RequestBody.create(type, ${JSON.stringify(b)})` : 'null'};\n        Request.Builder rb = new Request.Builder()\n                .url("${buildFullUrl(u, q)}")\n                .method("${m}", reqBody);\n`;
  h.forEach((hd) => { out += `        rb.addHeader("${hd.name}", "${hd.value ?? ''}");\n`; });
  out += `        Request request = rb.build();\n        try (Response response = client.newCall(request).execute()) {\n            System.out.println(response.code());\n            System.out.println(response.body().string());\n        }\n    }\n}`;
  return out;
};

const gUnirest = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `// com.konghq:unirest-java:3.14.5\nimport kong.unirest.Unirest;\nimport kong.unirest.HttpResponse;\n\npublic class Main {\n    public static void main(String[] args) {\n        HttpResponse<String> response = Unirest.${m.toLowerCase()}("${buildFullUrl(u, q)}")\n`;
  h.forEach((hd) => { out += `            .header("${hd.name}", "${hd.value ?? ''}")\n`; });
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) out += `            .body(${JSON.stringify(b)})\n`;
  out += `            .asString();\n        System.out.println(response.getStatus());\n        System.out.println(response.getBody());\n    }\n}`;
  return out;
};

const gHttpUrlConn = (m: string, u: string, q: DraftKV[], h: DraftKV[], b: string): string => {
  if (!u) return '';
  let out = `import java.io.*;\nimport java.net.HttpURLConnection;\nimport java.net.URL;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        URL url = new URL("${buildFullUrl(u, q)}");\n        HttpURLConnection conn = (HttpURLConnection) url.openConnection();\n        conn.setRequestMethod("${m}");\n`;
  h.forEach((hd) => { out += `        conn.setRequestProperty("${hd.name}", "${hd.value ?? ''}");\n`; });
  if (['POST', 'PUT', 'PATCH'].includes(m) && b) {
    out += `        conn.setDoOutput(true);\n        try (OutputStream os = conn.getOutputStream()) {\n            byte[] input = ${JSON.stringify(b)}.getBytes("utf-8");\n            os.write(input, 0, input.length);\n        }\n`;
  }
  out += `        int code = conn.getResponseCode();\n        System.out.println(code);\n        try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {\n            String line;\n            while ((line = r.readLine()) != null) System.out.println(line);\n        }\n        conn.disconnect();\n    }\n}`;
  return out;
};

const generate = (lang: string, d: DraftSnapshot): string => {
  const method = d.method || 'GET';
  const url = d.url || '';
  const q = d.queryParams ?? [];
  const h = (d.headers ?? []).filter((x) => x.name?.trim() && (x.enabled ?? true));
  const body = d.bodyText ?? '';
  switch (lang) {
    case 'curl':                   return gCurl(method, url, q, h, body, d.bodyKind, d.bodyForm);
    case 'postman':                return gPostman(method, url, q, h, body);
    case 'javascript-fetch':       return gFetch(method, url, q, h, body);
    case 'javascript-jquery':      return gJQuery(method, url, q, h, body);
    case 'node-axios':             return gNodeAxios(method, url, q, h, body);
    case 'node-http':              return gNodeHttp(method, url, q, h, body);
    case 'python':                 return gPython(method, url, q, h, body);
    case 'httpie':                 return gHttpie(method, url, q, h, body);
    case 'java-okhttp':            return gOkHttp(method, url, q, h, body);
    case 'java-unirest':           return gUnirest(method, url, q, h, body);
    case 'java-httpurlconnection': return gHttpUrlConn(method, url, q, h, body);
    default:                       return '';
  }
};

/* =========================================================================
 *  Component
 * ========================================================================= */
const WRAP_CSS = `
  .code-wrap-container pre, .code-wrap-container pre code, .code-wrap-container pre code span {
    white-space: pre-wrap !important; word-wrap: break-word !important;
    word-break: break-word !important; overflow-wrap: anywhere !important;
    background: transparent !important;
  }
`;

export const CodeSnippetPanel = () => {
  const draft = useRequestDraftStore((s) => s.current);
  const setSnapshot = useRequestDraftStore((s) => s.setSnapshot);
  const variableMode = useSettings((s) => s.snippetVariableMode);
  const updateSetting = useSettings((s) => s.update);
  const activeEnvId = useSettings((s) => s.activeEnvId);
  const workspaceId = useWorkspaceStore((s) => s.current?.id);

  /* Pull all envs (active, project, globals) when the user enables "resolve"
     mode. Query is disabled otherwise so we don't waste network. */
  const { data: allEnvs = [] } = useQuery({
    queryKey: ['envs-for-snippet', workspaceId, variableMode],
    queryFn: () => listEnvironmentsFull(workspaceId, true),
    enabled: variableMode === 'resolve' && !!workspaceId,
    staleTime: 30_000,
  });

  const varMap = useMemo(() => {
    if (variableMode !== 'resolve') return {};
    const active  = allEnvs.find((e) => e.id === activeEnvId && e.scope === 'ENVIRONMENT') ?? null;
    const project = allEnvs.find((e) => e.scope === 'WORKSPACE' && e.workspaceId === workspaceId) ?? null;
    const globals = allEnvs.find((e) => e.scope === 'GLOBAL') ?? null;
    return buildVarMap(active, project, globals);
  }, [variableMode, allEnvs, activeEnvId, workspaceId]);

  /* Draft that the generators consume — either the raw one (show mode) or
     a deep-substituted copy (resolve mode). */
  const effectiveDraft = useMemo(
    () => (variableMode === 'resolve' && Object.keys(varMap).length ? substituteDeep(draft, varMap) : draft),
    [variableMode, varMap, draft],
  );

  const [selected, setSelected] = useState<string>(() => localStorage.getItem(LS_KEY) ?? 'curl');
  const [open, setOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);
  const isInternal = useRef(false);

  const ddRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);

  const lang = useMemo(() => LANGS.find((l) => l.value === selected) ?? LANGS[0], [selected]);
  const editable = !!lang.editable;

  useEffect(() => { localStorage.setItem(LS_KEY, selected); }, [selected]);

  /* Close the language dropdown on outside click. */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false);
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) setGearOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Regenerate snippet whenever the effective draft OR language changes —
     unless this change originated from the user typing in the editable
     area itself. */
  const generated = useMemo(() => generate(selected, effectiveDraft), [selected, effectiveDraft]);
  useEffect(() => {
    if (isInternal.current) { isInternal.current = false; return; }
    setEditedText(null);
  }, [generated]);

  const displayed = editedText ?? generated;

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setEditedText(v);
    if (selected === 'curl') {
      const patch = parseCurl(v);
      if (patch) { isInternal.current = true; setSnapshot(patch); }
    } else if (selected === 'postman') {
      const patch = parsePostmanCli(v);
      if (patch) { isInternal.current = true; setSnapshot(patch); }
    }
  };

  const onCopy = () => {
    if (!displayed.trim()) { toast.info('Nothing to copy yet'); return; }
    navigator.clipboard.writeText(displayed);
    setCopied(true); toast.success('Snippet copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (hlRef.current) hlRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
  };

  /* ---------- Empty state ---------- */
  if (!draft.source) {
    return (
      <div className="flex h-full flex-col bg-probestack-bg" data-testid="code-snippet-empty">
        <Toolbar
          ddRef={ddRef}
          gearRef={gearRef}
          open={open}
          setOpen={setOpen}
          gearOpen={gearOpen}
          setGearOpen={setGearOpen}
          selected={selected}
          setSelected={setSelected}
          editable={false}
          copied={copied}
          onCopy={onCopy}
          variableMode={variableMode}
          onVariableMode={(m) => updateSetting('snippetVariableMode', m)}
          disabled
        />
        <div className="flex-1 overflow-auto p-4">
          <FancyEmpty
            testId="code-snippet-empty-state"
            icon="code"
            title="No request open"
            body="Open a request from a collection or a mock to generate a code snippet here."
            steps={[
              'Open the Request Builder, or a Mock / MCP tool call',
              'Pick your target language from the dropdown above',
              'Copy-paste the snippet wherever you need it',
            ]}
          />
        </div>
      </div>
    );
  }

  /* ---------- Main view ---------- */
  const hlStyle = {
    margin: 0,
    padding: '14px 16px',
    background: 'transparent',
    fontSize: '12px',
    lineHeight: '1.6',
    minHeight: '100%',
    overflow: 'visible',
  } as const;
  const codeTagStyle = {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflowWrap: 'anywhere' as const,
    fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace',
    background: 'transparent',
  };

  return (
    <div className="flex h-full flex-col bg-probestack-bg" data-testid="code-snippet-panel">
      <style>{WRAP_CSS}</style>

      <Toolbar
        ddRef={ddRef}
        gearRef={gearRef}
        open={open}
        setOpen={setOpen}
        gearOpen={gearOpen}
        setGearOpen={setGearOpen}
        selected={selected}
        setSelected={setSelected}
        editable={editable}
        copied={copied}
        onCopy={onCopy}
        variableMode={variableMode}
        onVariableMode={(m) => updateSetting('snippetVariableMode', m)}
      />

      {/* SubHeader — method + URL quick glance */}
      <div
        data-testid="code-snippet-subheader"
        className="flex items-center gap-2 border-b border-border px-3 py-1.5"
      >
        <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-secondary">
          {draft.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-text-muted" title={draft.url}>
          {draft.url || '(no URL)'}
        </span>
      </div>

      {/* Code display */}
      <div className="code-wrap-container relative min-h-0 flex-1 overflow-hidden">
        {editable ? (
          <div className="relative h-full w-full overflow-hidden">
            <div
              ref={hlRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-y-auto overflow-x-hidden"
            >
              <SyntaxHighlighter
                language={lang.syntax}
                style={oneDark}
                customStyle={hlStyle}
                codeTagProps={{ style: codeTagStyle }}
                wrapLongLines
              >
                {displayed || ' '}
              </SyntaxHighlighter>
            </div>
            <textarea
              ref={taRef}
              data-testid="code-snippet-editor"
              value={displayed}
              onChange={onChange}
              onScroll={syncScroll}
              spellCheck={false}
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-[14px] pl-4 pr-4 font-mono text-[12px] leading-relaxed caret-white outline-none"
              style={{ color: 'transparent', caretColor: 'white', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              placeholder={selected === 'curl' ? 'Paste cURL command here…' : 'Paste Postman CLI command here…'}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden" data-testid="code-snippet-editor">
            <SyntaxHighlighter
              language={lang.syntax}
              style={oneDark}
              customStyle={hlStyle}
              codeTagProps={{ style: codeTagStyle }}
              wrapLongLines
            >
              {displayed || ' '}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      <footer className="border-t border-border bg-surface/40 px-3 py-2 text-[10px] text-text-muted">
        {editable
          ? <><AppIcon name="zap" className="mr-1 inline h-3 w-3" />Two-way sync — edits here update the request builder.</>
          : <>Read-only — switch to <strong>cURL</strong> or <strong>Postman CLI</strong> for two-way sync.</>}
      </footer>
    </div>
  );
};

/* =========================================================================
 *  Toolbar — language dropdown + editable/read-only badge + variable mode + copy
 * ========================================================================= */
const Toolbar = ({
  ddRef, gearRef, open, setOpen, gearOpen, setGearOpen,
  selected, setSelected,
  editable, copied, onCopy, disabled,
  variableMode, onVariableMode,
}: {
  ddRef: React.RefObject<HTMLDivElement | null>;
  gearRef: React.RefObject<HTMLDivElement | null>;
  open: boolean; setOpen: (v: boolean) => void;
  gearOpen: boolean; setGearOpen: (v: boolean) => void;
  selected: string; setSelected: (v: string) => void;
  editable: boolean; copied: boolean; onCopy: () => void;
  disabled?: boolean;
  variableMode: 'show' | 'resolve';
  onVariableMode: (m: 'show' | 'resolve') => void;
}) => {
  const current = LANGS.find((l) => l.value === selected) ?? LANGS[0];
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <div className="relative w-36" ref={ddRef}>
        <button
          type="button"
          data-testid="code-snippet-target-picker"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-elevated px-2.5 py-1.5 text-[11px] text-text-primary transition-colors',
            !disabled && 'hover:border-primary/40',
            disabled && 'opacity-50',
          )}
        >
          <span className="truncate">{current.label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} />
        </button>
        {open && !disabled && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-border bg-surface shadow-xl">
            {LANGS.map((l) => (
              <button
                key={l.value}
                type="button"
                data-testid={`code-snippet-target-${l.value}`}
                onClick={() => { setSelected(l.value); setOpen(false); }}
                className={cn(
                  'flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-hover',
                  selected === l.value ? 'bg-primary-muted/40 text-primary' : 'text-text-secondary',
                )}
              >
                <span className="truncate">{l.label}</span>
                {selected === l.value && <Check className="ml-2 h-3 w-3 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
          editable ? 'bg-success/10 text-success' : 'bg-elevated text-text-muted',
        )}
      >
        {editable ? 'Editable' : 'Read-only'}
      </span>

      {/* Variable-mode gear */}
      <div className="relative ml-auto" ref={gearRef}>
        <button
          type="button"
          data-testid="code-snippet-settings"
          onClick={() => setGearOpen(!gearOpen)}
          title="Snippet settings"
          className={cn(
            'grid h-7 w-7 place-items-center rounded-md border border-border bg-elevated text-text-muted transition-colors hover:border-primary/30 hover:text-primary',
            variableMode === 'resolve' && 'border-primary/40 text-primary',
          )}
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </button>
        {gearOpen && (
          <div
            data-testid="code-snippet-settings-popover"
            className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-surface p-3 shadow-xl"
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Variable rendering
            </div>
            <div className="space-y-1.5">
              <label
                data-testid="variable-mode-show"
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors',
                  variableMode === 'show' ? 'border-primary/40 bg-primary-muted/20' : 'border-border hover:border-primary/20',
                )}
              >
                <input
                  type="radio"
                  name="var-mode"
                  checked={variableMode === 'show'}
                  onChange={() => onVariableMode('show')}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-text-primary">Show <code className="rounded bg-elevated px-1 font-mono">{'{{var}}'}</code></span>
                  <span className="block text-[10px] leading-snug text-text-muted">
                    Keep placeholders as-is — safe for sharing, no secrets leaked.
                  </span>
                </span>
              </label>
              <label
                data-testid="variable-mode-resolve"
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors',
                  variableMode === 'resolve' ? 'border-primary/40 bg-primary-muted/20' : 'border-border hover:border-primary/20',
                )}
              >
                <input
                  type="radio"
                  name="var-mode"
                  checked={variableMode === 'resolve'}
                  onChange={() => onVariableMode('resolve')}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-text-primary">Resolve to actual values</span>
                  <span className="block text-[10px] leading-snug text-text-muted">
                    Substitute with active env / project / globals. Great for debugging — avoid sharing.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="code-snippet-copy"
        onClick={onCopy}
        title="Copy"
        className={cn(
          'grid h-7 w-7 place-items-center rounded-md border transition-colors',
          copied
            ? 'border-success/40 bg-success/10 text-success'
            : 'border-border bg-elevated text-text-muted hover:border-primary/30 hover:text-primary',
        )}
      >
        {copied ? <AppIcon name="success" className="h-3.5 w-3.5" /> : <AppIcon name="copy" className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

export default CodeSnippetPanel;
