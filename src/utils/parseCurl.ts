/**
 * Robust cURL parser — converts a copy-pasted cURL command into a
 * partial DraftSnapshot the request builder can apply directly.
 *
 *  Why a *new* parser?
 *  -------------------
 *  The previous `parseCurl` inside CodeSnippetPanel.tsx was a one-liner
 *  using regexes that only worked for very tidy snippets:
 *    - single-quote arguments only
 *    - no `--data-binary` / `--data-raw` / `--data-urlencode`
 *    - no `--form` / multipart
 *    - no line continuations beyond the simplest `\` newline
 *    - URL grabbed by `https?://` regex, breaking when the URL had no scheme
 *
 *  This module replaces it with a proper tokeniser → flag walker.
 *
 *  Supported flags (all aliases handled):
 *    -X / --request                 HTTP method
 *    -H / --header                  Header (repeatable)
 *    -d / --data / --data-raw       Body (string, can be repeated → joined with `&`)
 *    --data-binary                  Body (binary / multiline)
 *    --data-urlencode               Single key=val pair, urlencoded
 *    -F / --form                    Multipart key=value (repeatable)
 *    -u / --user                    Basic auth → Authorization header
 *    -e / --referer                 Referer header
 *    -A / --user-agent              User-Agent header
 *    --url                          Explicit URL flag
 *    -G / --get                     Force GET + move -d data into query string
 *    -k / --insecure / -L / --location etc. → silently ignored
 *
 *  Quoting: single quotes, double quotes, $'...' ANSI-C quoting and
 *  backslash-escaped chars are handled by the tokeniser.
 *
 *  Returns `null` if no URL could be extracted — caller can show a
 *  friendly toast ("Not a valid cURL").
 */
import type { DraftKV, DraftSnapshot } from '@/stores/requestDraft.store';

/* ─────────────────────────── tokenizer ────────────────────────────────── */

/** Split a shell-ish string into tokens, honouring single / double quotes,
 *  backslash escapes and line-continuation `\<newline>`. */
function tokenize(input: string): string[] {
  // Normalise line continuations first.
  const cleaned = input.replace(/\\\r?\n/g, ' ').trim();
  const out: string[] = [];
  let i = 0;
  const n = cleaned.length;
  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(cleaned[i])) i++;
    if (i >= n) break;
    let buf = '';
    while (i < n && !/\s/.test(cleaned[i])) {
      const ch = cleaned[i];
      if (ch === "'") {
        // single quote — literal until next '
        i++;
        while (i < n && cleaned[i] !== "'") buf += cleaned[i++];
        if (i < n) i++; // skip closing '
      } else if (ch === '"') {
        // double quote — supports backslash escapes
        i++;
        while (i < n && cleaned[i] !== '"') {
          if (cleaned[i] === '\\' && i + 1 < n) {
            buf += cleaned[i + 1];
            i += 2;
          } else {
            buf += cleaned[i++];
          }
        }
        if (i < n) i++; // skip closing "
      } else if (ch === '\\' && i + 1 < n) {
        // backslash escape in bare word
        buf += cleaned[i + 1];
        i += 2;
      } else if (ch === '$' && cleaned[i + 1] === "'") {
        // ANSI-C quoting $'...' — minimal: take literal, handle \n, \t
        i += 2;
        while (i < n && cleaned[i] !== "'") {
          if (cleaned[i] === '\\' && i + 1 < n) {
            const esc = cleaned[i + 1];
            if (esc === 'n') buf += '\n';
            else if (esc === 't') buf += '\t';
            else if (esc === 'r') buf += '\r';
            else buf += esc;
            i += 2;
          } else buf += cleaned[i++];
        }
        if (i < n) i++; // skip closing '
      } else {
        buf += cleaned[i++];
      }
    }
    out.push(buf);
  }
  return out;
}

/* ─────────────────────────── helpers ──────────────────────────────────── */

function parseQuery(url: string): DraftKV[] {
  const idx = url.indexOf('?');
  if (idx < 0) return [];
  const qs = url.slice(idx + 1);
  if (!qs) return [];
  return qs.split('&').filter(Boolean).map((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) {
      return { name: decodeSafe(pair), value: '', enabled: true };
    }
    return {
      name:  decodeSafe(pair.slice(0, eq)),
      value: decodeSafe(pair.slice(eq + 1)),
      enabled: true,
    };
  });
}
function decodeSafe(s: string): string {
  try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; }
}

function pushHeader(headers: DraftKV[], raw: string): void {
  const colon = raw.indexOf(':');
  if (colon <= 0) return;
  const name  = raw.slice(0, colon).trim();
  const value = raw.slice(colon + 1).trim();
  if (!name) return;
  // De-duplicate on (name) — keep the most-recent value.
  const existing = headers.findIndex((h) => h.name.toLowerCase() === name.toLowerCase());
  if (existing >= 0) headers[existing] = { name, value, enabled: true };
  else headers.push({ name, value, enabled: true });
}

/** Crude JSON detector — used to pick `bodyKind: 'json'` automatically. */
function looksLikeJson(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!(t.startsWith('{') || t.startsWith('['))) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

/* ─────────────────────────── main parser ──────────────────────────────── */

export interface ParseCurlResult {
  draft: Partial<DraftSnapshot>;
  notes: string[];   // human-readable hints (e.g. "Detected POST · 3 headers")
}

export function parseCurl(input: string): ParseCurlResult | null {
  if (!input || !/curl\b/i.test(input)) return null;

  // Strip a leading `curl` keyword if present.
  const stripped = input.replace(/^\s*curl\s+/i, '');
  const tokens = tokenize(stripped);
  if (tokens.length === 0) return null;

  let method:    string | undefined;
  let urlExplicit: string | undefined;
  let urlBare:     string | undefined;
  const headers: DraftKV[] = [];
  const formParts: DraftKV[] = [];
  const dataParts: string[] = [];
  let dataBinary: string | undefined;
  let dataUrlEncodeParts: string[] = [];
  let forceGet = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // Long flags: --foo or --foo=value
    if (t === '-X' || t === '--request') {
      method = (tokens[++i] || '').toUpperCase(); continue;
    }
    if (t === '-H' || t === '--header') {
      pushHeader(headers, tokens[++i] || ''); continue;
    }
    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-ascii') {
      dataParts.push(tokens[++i] || ''); continue;
    }
    if (t === '--data-binary') {
      const val = tokens[++i] || '';
      // `@filename` is a curl shortcut for reading from a file — we can't
      // do that in-browser, so we surface it literally.
      dataBinary = val.startsWith('@') ? `<binary from ${val.slice(1)}>` : val;
      continue;
    }
    if (t === '--data-urlencode') {
      dataUrlEncodeParts.push(tokens[++i] || ''); continue;
    }
    if (t === '-F' || t === '--form') {
      const part = tokens[++i] || '';
      const eq = part.indexOf('=');
      if (eq > 0) {
        formParts.push({ name: part.slice(0, eq), value: part.slice(eq + 1), enabled: true });
      }
      continue;
    }
    if (t === '-u' || t === '--user') {
      const cred = tokens[++i] || '';
      // Browser-safe base64 — `btoa` handles ASCII only, which is what
      // Basic-auth credentials are anyway.
      try {
        pushHeader(headers, `Authorization: Basic ${btoa(cred)}`);
      } catch { /* non-ascii cred — skip silently */ }
      continue;
    }
    if (t === '-e' || t === '--referer') {
      pushHeader(headers, `Referer: ${tokens[++i] || ''}`); continue;
    }
    if (t === '-A' || t === '--user-agent') {
      pushHeader(headers, `User-Agent: ${tokens[++i] || ''}`); continue;
    }
    if (t === '--url') {
      urlExplicit = tokens[++i]; continue;
    }
    if (t === '-G' || t === '--get') { forceGet = true; continue; }
    // Flags we don't act on but shouldn't consume the next arg:
    if (t === '-k' || t === '--insecure' || t === '-L' || t === '--location' ||
        t === '-s' || t === '--silent'   || t === '-v' || t === '--verbose'  ||
        t === '-i' || t === '--include'  || t === '-I' || t === '--head'     ||
        t === '--compressed' || t === '--http2' || t === '--http1.1') {
      continue;
    }
    // Flags that consume an arg we don't care about:
    if (t === '-o' || t === '--output' || t === '-w' || t === '--write-out' ||
        t === '--connect-timeout' || t === '--max-time' || t === '-x' || t === '--proxy' ||
        t === '--retry' || t === '--retry-delay' || t === '--cert' || t === '--key' ||
        t === '-b' || t === '--cookie' || t === '-c' || t === '--cookie-jar') {
      i++; continue;
    }
    // Long-form `--flag=value` — try to parse known ones, else ignore.
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      if (eq > 0) {
        const flag = t.slice(0, eq);
        const value = t.slice(eq + 1);
        if (flag === '--url')          { urlExplicit = value; continue; }
        if (flag === '--header')       { pushHeader(headers, value); continue; }
        if (flag === '--data')         { dataParts.push(value); continue; }
        if (flag === '--data-raw')     { dataParts.push(value); continue; }
        if (flag === '--data-urlencode') { dataUrlEncodeParts.push(value); continue; }
      }
      continue;  // unknown long flag — ignore
    }
    if (t.startsWith('-') && t.length > 1) continue; // unknown short flag

    // Plain positional → URL candidate (take the FIRST one).
    if (!urlBare) urlBare = t;
  }

  let url = (urlExplicit ?? urlBare ?? '').trim();
  if (!url) return null;

  // Add scheme if user pasted `example.com/foo` (curl tolerates this).
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith('{{')) {
    url = 'https://' + url;
  }

  // Merge -d arguments (curl joins with '&' when multiple -d given without -G).
  let body = dataParts.length > 0 ? dataParts.join('&') : '';
  if (dataBinary !== undefined && !body) body = dataBinary;

  // --data-urlencode parts always merged + urlencoded.
  if (dataUrlEncodeParts.length > 0) {
    const enc = dataUrlEncodeParts.map((p) => {
      const eq = p.indexOf('=');
      if (eq < 0) return encodeURIComponent(p);
      return `${encodeURIComponent(p.slice(0, eq))}=${encodeURIComponent(p.slice(eq + 1))}`;
    }).join('&');
    body = body ? `${body}&${enc}` : enc;
  }

  // -G forces GET + appends body to query string.
  if (forceGet && body) {
    url = url.includes('?') ? `${url}&${body}` : `${url}?${body}`;
    body = '';
  }

  // Default method inference.
  if (!method) {
    if (forceGet)               method = 'GET';
    else if (formParts.length)  method = 'POST';
    else if (body)              method = 'POST';
    else                        method = 'GET';
  }

  // Split URL → base + queryParams
  const queryParams = parseQuery(url);
  const baseUrl     = url.split('?')[0];

  // Decide bodyKind
  let bodyKind: DraftSnapshot['bodyKind'] = 'none';
  let bodyText: string | undefined;
  let bodyForm: DraftKV[] | undefined;

  if (formParts.length > 0) {
    bodyKind = 'multipart';
    bodyForm = formParts;
  } else if (body) {
    if (looksLikeJson(body)) { bodyKind = 'json'; bodyText = body; }
    else                     { bodyKind = 'text'; bodyText = body; }
  }

  // Friendly summary for the toast.
  const notes: string[] = [];
  notes.push(`${method} ${baseUrl}`);
  if (headers.length)     notes.push(`${headers.length} header${headers.length === 1 ? '' : 's'}`);
  if (queryParams.length) notes.push(`${queryParams.length} query param${queryParams.length === 1 ? '' : 's'}`);
  if (bodyKind !== 'none') notes.push(`${bodyKind} body`);

  return {
    draft: {
      method,
      url: baseUrl,
      queryParams,
      headers,
      bodyKind,
      bodyText,
      bodyForm,
    },
    notes,
  };
}

/** Convenience predicate — does a pasted string look like a cURL command? */
export function looksLikeCurl(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  // Multi-token cURL OR just begins with `curl ` and contains a URL-ish thing.
  return /^curl\b/i.test(t) || /^\s*curl\s+/i.test(t);
}
