/**
 * GraphQLVariablesPanel — dual-mode editor for GraphQL operation
 * variables. Two tabs:
 *
 *   • Form — automatically generates a row per variable declared in
 *     the operation signature (`query Q($id: ID!, $limit: Int = 10)`),
 *     showing the variable name, GraphQL type badge, and a value
 *     widget chosen from the underlying scalar (Boolean → checkbox,
 *     Int / Float → number, String / ID / enum → text). Editing a
 *     value re-serialises the whole bag to JSON and emits
 *     `onChange(json)` so the existing run flow stays untouched.
 *
 *   • JSON — the original raw JSON textarea.
 *
 *  Switching tabs:
 *   • Leaving Form → already in sync.
 *   • Leaving JSON → if the JSON parses, hydrate the Form values from
 *     it; otherwise the Form falls back to defaults from the query
 *     signature. A small warning is shown when JSON is invalid.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { Braces, ListChecks, AlertCircle } from 'lucide-react';

interface VariableDecl {
  name: string;
  rawType: string;
  scalar: string;
  required: boolean;
  list: boolean;
  defaultValue?: string;
}

export const parseVariableDeclarations = (query: string): VariableDecl[] => {
  const m = query.match(/\b(?:query|mutation|subscription)\b[^({]*\(([^)]*)\)/);
  if (!m) return [];
  const inside = m[1].trim();
  if (!inside) return [];
  const decls: VariableDecl[] = [];
  for (const raw of inside.split(/,(?![^[]*\])/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\$([A-Za-z_][\w]*)\s*:\s*([^=]+?)(?:\s*=\s*(.+))?$/);
    if (!match) continue;
    const [, name, rawType, defaultValue] = match;
    const required = rawType.trim().endsWith('!');
    const list = rawType.trim().startsWith('[');
    const scalar = rawType.replace(/[![\]]/g, '').trim();
    decls.push({ name, rawType: rawType.trim(), scalar, required, list, defaultValue });
  }
  return decls;
};

const defaultForScalar = (s: string): any => {
  switch (s) {
    case 'Int':
    case 'Float': return 0;
    case 'Boolean': return false;
    case 'ID':
    case 'String': return '';
    default: return '';
  }
};

const coerce = (raw: string, scalar: string): any => {
  if (raw === '') return null;
  if (scalar === 'Int')   { const n = parseInt(raw, 10);  return Number.isFinite(n) ? n : raw; }
  if (scalar === 'Float') { const n = parseFloat(raw);    return Number.isFinite(n) ? n : raw; }
  if (scalar === 'Boolean') return raw === 'true';
  if (/^\s*[{[]/.test(raw)) { try { return JSON.parse(raw); } catch { /* fall through */ } }
  return raw;
};

export function GraphQLVariablesPanel({
  query, value, onChange,
}: {
  query: string;
  value: string;
  onChange: (json: string) => void;
}) {
  const [tab, setTab] = useState<'form' | 'json'>('form');
  const decls = useMemo(() => parseVariableDeclarations(query), [query]);
  const parsed = useMemo<Record<string, any> | null>(() => {
    if (!value.trim()) return {};
    try { return JSON.parse(value); } catch { return null; }
  }, [value]);
  const jsonInvalid = parsed === null;

  const getFormValue = (d: VariableDecl): any => {
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, d.name)) return parsed[d.name];
    if (d.defaultValue !== undefined) {
      try { return JSON.parse(d.defaultValue); } catch { return d.defaultValue; }
    }
    return defaultForScalar(d.scalar);
  };
  const setFormValue = (name: string, scalar: string, rawInput: string) => {
    const next: Record<string, any> = { ...(parsed ?? {}) };
    next[name] = coerce(rawInput, scalar);
    onChange(JSON.stringify(next, null, 2));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-0.5 border-b border-border/60 px-3 py-1.5 text-[10px]">
        <button
          data-testid="gql-vars-tab-form"
          onClick={() => setTab('form')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 font-semibold transition-colors',
            tab === 'form' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-hover',
          )}
        >
          <ListChecks className="h-3 w-3" /> Form
          <span className="ml-1 rounded bg-text-muted/15 px-1 text-[9px]">{decls.length}</span>
        </button>
        <button
          data-testid="gql-vars-tab-json"
          onClick={() => setTab('json')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 font-semibold transition-colors',
            tab === 'json' ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-hover',
          )}
        >
          <Braces className="h-3 w-3" /> JSON
        </button>
        <span className="ml-auto pr-1 text-[10px] text-text-muted">
          {decls.length === 0 ? 'no $variables declared' : `${decls.length} variable${decls.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {tab === 'form' && (
        <div data-testid="gql-vars-form-root" className="flex-1 overflow-auto p-3">
          {jsonInvalid && (
            <div
              data-testid="gql-vars-warning"
              className="mb-2 flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              JSON tab has a syntax error — Form edits will overwrite it on save.
            </div>
          )}
          {decls.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-[11px] text-text-muted">
              Declare variables in your query like <code className="text-text-primary">query Q($id: ID!) {'{ … }'}</code> and they will show up here as a form.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {decls.map((d) => {
                const v = getFormValue(d);
                const inputProps = {
                  'data-testid': `gql-vars-form-input-${d.name}`,
                  className: 'h-7 flex-1 rounded-md border border-border bg-elevated px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30',
                };
                return (
                  <div key={d.name} data-testid={`gql-vars-form-row-${d.name}`} className="flex items-center gap-2">
                    <span className="w-24 truncate text-[11px] font-mono text-cyan-400">${d.name}</span>
                    <span className="w-20 truncate rounded bg-text-muted/10 px-1.5 py-0.5 text-[10px] font-mono text-orange-400" title={d.rawType}>
                      {d.rawType}
                    </span>
                    {d.scalar === 'Boolean' && !d.list ? (
                      <select {...inputProps} value={String(v === true)} onChange={(e) => setFormValue(d.name, d.scalar, e.target.value)}>
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    ) : (d.scalar === 'Int' || d.scalar === 'Float') && !d.list ? (
                      <input {...inputProps} type="number" value={v ?? ''}
                        onChange={(e) => setFormValue(d.name, d.scalar, e.target.value)}
                        placeholder={d.required ? 'required' : 'optional'} />
                    ) : (
                      <input {...inputProps} type="text"
                        value={typeof v === 'object' ? JSON.stringify(v) : (v ?? '')}
                        onChange={(e) => setFormValue(d.name, d.scalar, e.target.value)}
                        placeholder={d.required ? 'required' : 'optional'} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'json' && (
        <textarea
          data-testid="gql-vars-json"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 resize-none bg-elevated p-3 font-mono text-xs focus:outline-none"
          spellCheck={false}
          placeholder='{ "id": "1" }'
        />
      )}
    </div>
  );
}
