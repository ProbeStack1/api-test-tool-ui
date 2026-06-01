/**
 * Terminal service — talks to {@code /api/v1/requests/terminal/*} on
 * `forgeq-request-mgmt-svc`. Streams the {@code /exec} response back
 * as SSE using {@code fetch().body.getReader()} so we can both POST
 * the command body and read a chunked event stream from the same
 * connection.
 */
import { serviceUrl } from '@/lib/env';
import { useAuth } from '@/stores/auth.store';

export interface TerminalLine {
  level: string;
  text: string;
  data?: Record<string, unknown>;
}

export interface ExecRequest {
  line: string;
  sessionId: string;
  currentCollectionId?: string;
  currentWorkspaceId?: string;
}

export interface HelpEntry {
  name: string;
  usage: string;
  description: string;
  examples?: string[];
}

export interface HelpCatalog {
  prompt: string;
  commands: HelpEntry[];
}

export interface AuditView {
  auditId: string;
  sessionId?: string;
  line?: string;
  command?: string;
  outcome?: string;
  durationMs?: number;
  linesEmitted?: number;
  errorMessage?: string;
  userEmail?: string;
  executedAt?: string;
}

const base = () => `${serviceUrl('request')}/api/v1/requests/terminal`;

const authHeader = (): Record<string, string> => {
  const tok = useAuth.getState().accessToken;
  return tok ? { Authorization: `Bearer ${tok}` } : {};
};

/**
 * Stream one command's output. {@code onLine} fires for every SSE event;
 * the function resolves to the final outcome (SUCCESS / FAILURE / DENIED).
 * The returned {@link AbortController} lets the caller cancel mid-stream
 * (Ctrl+C in the UI).
 */
export const execTerminal = (
  req: ExecRequest,
  onLine: (event: string, line: TerminalLine | { outcome: string }) => void,
): { abort: () => void; done: Promise<string> } => {
  const controller = new AbortController();
  const done: Promise<string> = (async () => {
    let res: Response;
    try {
      res = await fetch(`${base()}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeader(),
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
    } catch (e) {
      onLine('error', { level: 'error', text: 'Network: ' + (e as Error).message });
      return 'FAILURE';
    }
    if (!res.ok || !res.body) {
      onLine('error', { level: 'error', text: `HTTP ${res.status}` });
      return 'FAILURE';
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let outcome = 'SUCCESS';
    // SSE frames are separated by a blank line; each frame may have
    // multiple `event:` / `data:` fields.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done: rDone } = await reader.read();
      if (rDone) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let event = 'line';
        const dataLines: string[] = [];
        for (const ln of frame.split('\n')) {
          if (ln.startsWith('event:')) event = ln.slice(6).trim();
          else if (ln.startsWith('data:')) dataLines.push(ln.slice(5).trim());
        }
        if (!dataLines.length) continue;
        const raw = dataLines.join('\n');
        try {
          const parsed = JSON.parse(raw);
          if (event === 'done') {
            outcome = parsed.outcome ?? 'SUCCESS';
            onLine('done', { outcome });
          } else {
            onLine(event, parsed as TerminalLine);
          }
        } catch {
          // server emitted plain string — treat as a raw line.
          onLine(event, { level: event, text: raw });
        }
      }
    }
    return outcome;
  })();
  return { abort: () => controller.abort(), done };
};

export const fetchHelp = async (): Promise<HelpCatalog> => {
  const res = await fetch(`${base()}/help`, { headers: { ...authHeader() } });
  const json = await res.json();
  return json.data as HelpCatalog;
};

/** Fresh prompt for the user — call after workspace/collection change. */
export const fetchPrompt = async (
  workspaceId?: string,
  collectionId?: string,
): Promise<string> => {
  const qs = new URLSearchParams();
  if (workspaceId)  qs.set('workspaceId', workspaceId);
  if (collectionId) qs.set('collectionId', collectionId);
  const res = await fetch(`${base()}/prompt?${qs.toString()}`, { headers: { ...authHeader() } });
  if (!res.ok) return 'forgefuzz$ ';
  const json = await res.json();
  return json.data?.prompt ?? 'forgefuzz$ ';
};

/** Tab-autocomplete — returns the candidate tokens for the line as typed. */
export const fetchSuggest = async (
  line: string,
  workspaceId?: string,
  collectionId?: string,
): Promise<string[]> => {
  const qs = new URLSearchParams({ line });
  if (workspaceId)  qs.set('workspaceId', workspaceId);
  if (collectionId) qs.set('collectionId', collectionId);
  const res = await fetch(`${base()}/suggest?${qs.toString()}`, { headers: { ...authHeader() } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as string[];
};

export const fetchAudit = async (limit = 50): Promise<AuditView[]> => {
  const res = await fetch(`${base()}/audit?limit=${limit}`, { headers: { ...authHeader() } });
  const json = await res.json();
  return (json.data ?? []) as AuditView[];
};
