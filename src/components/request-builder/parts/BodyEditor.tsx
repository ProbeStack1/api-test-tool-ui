/**
 * BodyEditor — delegates to the correct sub-editor based on mode.
 *
 *   • none              — placeholder
 *   • form-data         — KV table with an extra Text | File type per row;
 *                         File rows open FilePickerPopover
 *   • x-www-form-urlencoded — KV table (no File type)
 *   • raw               — Monaco code editor; language dropdown (JSON | Text)
 *
 * All free-text inputs here use VariableInput so `{{var}}` light up.
 */
import { useEffect, useRef, useState } from 'react';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { type CodeLanguage } from '@/components/editor/CodeEditor';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { VariableInput } from '@/components/ui/VariableInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/stores/settings.store';
import { generateBody } from '@/services/bodyGenerate.service';
import { FilePickerPopover, FileValueDisplay, type FileValue } from './FilePicker';

export type BodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
export const BODY_MODES: BodyMode[] = ['none', 'form-data', 'x-www-form-urlencoded', 'raw'];

export interface FormDataRow {
  id: string;
  key: string;
  type: 'text' | 'file';
  enabled: boolean;
  description?: string;
  /** text type: value is a string; file type: value is a FileValue. */
  value: string | FileValue;
}
export interface UrlEncodedRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  mode: BodyMode;
  raw?: string;
  language?: CodeLanguage;
  formData?: FormDataRow[];
  urlEncoded?: UrlEncodedRow[];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyFD = (): FormDataRow => ({ id: uid(), key: '', type: 'text', value: '', enabled: true });
const emptyUE = (): UrlEncodedRow => ({ id: uid(), key: '', value: '', enabled: true });

/** HTTP methods that cannot carry a request body per RFC 7231/9110 (GET, HEAD)
 *  and methods we treat as body-less by convention (OPTIONS, TRACE). The
 *  RequestBuilder uses this to hard-disable the body editor instead of
 *  silently sending one. */
export const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

/** Render `mod+Enter` etc. as the platform-specific keycap. */
const formatShortcut = (s: string): string => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac');
  return s.replace(/mod/g, isMac ? '⌘' : 'Ctrl').replace(/\+/g, isMac ? '' : '+');
};

export const BodyEditor = ({
  value, onChange, method, url,
}: { value: RequestBody; onChange: (v: RequestBody) => void; method?: string; url?: string }) => {
  const lockedNone = !!method && METHODS_WITHOUT_BODY.has(method.toUpperCase());
  const setMode = (mode: BodyMode) => onChange({ ...value, mode });
  // Keep state consistent with the lock so a Postman import that arrived
  // with mode='raw' on a GET stays cosmetically-clean.
  if (lockedNone && value.mode !== 'none') {
    queueMicrotask(() => onChange({ ...value, mode: 'none' }));
  }

  // ── Body generator wiring ───────────────────────────────────────────
  const aiCommentEnabled = useSettings((s) => s.aiGenerateFromCommentEnabled);
  const aiShortcut = useSettings((s) => s.aiGenerateShortcut);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [intent, setIntent] = useState('');
  const [generating, setGenerating] = useState(false);
  // Buffer used by the typewriter so the editor visibly fills up character
  // by character — feels like the AI is "writing" in real time.
  const typewriterRef = useRef<{ stop: () => void } | null>(null);

  const lang: CodeLanguage = (value.language ?? 'json') as CodeLanguage;

  /** Replace the editor body via a typewriter animation so the user
   *  visually sees the AI typing the JSON / text. Cancellable. */
  const typewriterReplace = (text: string) => {
    typewriterRef.current?.stop();
    let i = 0;
    let cancelled = false;
    onChange({ ...value, raw: '' });
    const step = () => {
      if (cancelled) return;
      // Speed scales with length so a 1k-char body finishes in ~1 s.
      const chunk = Math.max(2, Math.ceil(text.length / 220));
      i = Math.min(text.length, i + chunk);
      onChange({ ...value, raw: text.slice(0, i) });
      if (i < text.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    typewriterRef.current = { stop: () => { cancelled = true; } };
  };

  /** Run the generator — either via the toolbar `Generate` button (uses
   *  the dialog intent) or via the `// generate: …` shortcut (uses the
   *  comment text scraped by Monaco). */
  const runGenerator = async (rawIntent: string, opts: { existingBody?: string } = {}) => {
    const trimmed = rawIntent.trim();
    if (!trimmed) {
      toast.error('Describe what the body should contain.');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateBody({
        intent: trimmed,
        method,
        url,
        language: lang === 'text' ? 'text' : 'json',
        existingBody: opts.existingBody ?? value.raw ?? '',
      });
      typewriterReplace(res.body);
      setGeneratorOpen(false);
      setIntent('');
      toast.success('AI body generated. Review the fields before sending.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Body generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // Cleanup any in-flight typewriter when the editor unmounts.
  useEffect(() => () => typewriterRef.current?.stop(), []);
  return (
    <div className="flex h-full flex-col gap-3" data-testid="body-editor">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {BODY_MODES.map((m) => (
          <label
            key={m}
            className={cn(
              'flex items-center gap-1.5 text-text-secondary',
              lockedNone ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            )}
          >
            <input
              type="radio"
              checked={(lockedNone ? 'none' : value.mode) === m}
              onChange={() => { if (!lockedNone) setMode(m); }}
              disabled={lockedNone && m !== 'none'}
              data-testid={`body-mode-${m}`}
              className="accent-[var(--color-primary)]"
            />
            <span className={cn(value.mode === m && !lockedNone && 'text-primary')}>{m}</span>
          </label>
        ))}
        {value.mode === 'raw' && !lockedNone && (
          <div className="ml-auto flex items-center gap-2" data-testid="body-raw-toolbar">
            <Select
              testId="body-raw-lang"
              value={value.language || 'json'}
              onChange={(v) => onChange({ ...value, language: v as CodeLanguage })}
              options={[{ value: 'json', label: 'JSON' }, { value: 'text', label: 'Text' }]}
            />
            <Button
              size="sm"
              variant="outline"
              data-testid="body-generate-btn"
              onClick={() => setGeneratorOpen((o) => !o)}
              className="gap-1.5"
              title={`Generate body with AI (${formatShortcut(aiShortcut)})`}
            >
              {generating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5 text-primary" />}
              Generate
            </Button>
          </div>
        )}
      </div>

      {generatorOpen && value.mode === 'raw' && !lockedNone && (
        <div
          data-testid="body-generate-popover"
          className="rounded-lg border border-primary/30 bg-primary/[0.04] p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> AI body generator
          </div>
          <p className="mb-2 text-[11px] text-text-muted">
            Describe what the body should contain — fields, types, example values. AI uses your URL ({url || '—'})
            and method ({method || 'POST'}) as context.
          </p>
          <textarea
            data-testid="body-generate-intent"
            autoFocus
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => {
              const isMod = e.metaKey || e.ctrlKey;
              if (isMod && e.key === 'Enter') {
                e.preventDefault();
                runGenerator(intent);
              }
            }}
            placeholder="e.g. user signup with email, password, full name and a referral code"
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-probestack-bg px-2.5 py-2 text-xs"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setGeneratorOpen(false); setIntent(''); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              data-testid="body-generate-submit"
              onClick={() => runGenerator(intent)}
              disabled={generating || !intent.trim()}
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-[240px] flex-1">
        {(lockedNone || value.mode === 'none') && (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-xs italic text-text-muted">
            {lockedNone
              ? `${method?.toUpperCase()} requests do not carry a body.`
              : 'This request does not have a body.'}
          </div>
        )}
        {!lockedNone && value.mode === 'raw' && (
          <MonacoEditor
            value={value.raw ?? ''}
            onChange={(v) => onChange({ ...value, raw: v })}
            language={(value.language ?? 'json') as CodeLanguage}
            testId="body-raw-editor"
            aiCopilotIntent="body"
            aiGenerateEnabled={aiCommentEnabled}
            aiGenerateShortcut={aiShortcut}
            placeholder={
              `// generate: describe the body here, then press ${formatShortcut(aiShortcut)}\n` +
              `// e.g. // generate: user signup with email, password, full name`
            }
            onAiGenerate={(commentText) =>
              runGenerator(commentText, { existingBody: value.raw ?? '' })
            }
          />
        )}
        {!lockedNone && value.mode === 'form-data' && (
          <FormDataTable
            rows={value.formData ?? []}
            onChange={(rows) => onChange({ ...value, formData: rows })}
          />
        )}
        {!lockedNone && value.mode === 'x-www-form-urlencoded' && (
          <UrlEncodedTable
            rows={value.urlEncoded ?? []}
            onChange={(rows) => onChange({ ...value, urlEncoded: rows })}
          />
        )}
      </div>
    </div>
  );
};

/* ─── form-data ─── */
const FormDataTable = ({
  rows, onChange,
}: { rows: FormDataRow[]; onChange: (rows: FormDataRow[]) => void }) => {
  const withTrailer = (() => {
    const copy = rows.filter((r) => !(
      r.key === '' && (r.type === 'text' ? r.value === '' : (r.value as FileValue).kind === 'none')
    ));
    copy.push(emptyFD());
    return copy;
  })();
  const update = (idx: number, patch: Partial<FormDataRow>) =>
    onChange(withTrailer.map((r, i) => (i === idx ? { ...r, ...patch } as FormDataRow : r)));
  const remove = (idx: number) => {
    if (idx === withTrailer.length - 1) return;
    onChange(withTrailer.filter((_, i) => i !== idx));
  };

  const COLS = '32px minmax(0,1fr) 110px minmax(0,1fr) 28px';
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div
        className="grid items-center border-b border-border bg-surface/60 text-[10px] font-semibold uppercase tracking-wide text-text-muted"
        style={{ gridTemplateColumns: COLS }}
      >
        <span />
        <span className="px-2 py-1.5">Key</span>
        <span className="px-2 py-1.5">Type</span>
        <span className="px-2 py-1.5">Value</span>
        <span />
      </div>
      {withTrailer.map((r, idx) => (
        <FormDataRowView
          key={r.id}
          row={r}
          cols={COLS}
          isTrailer={idx === withTrailer.length - 1}
          update={(p) => update(idx, p)}
          remove={() => remove(idx)}
          testId={`fd-row-${idx}`}
        />
      ))}
    </div>
  );
};

const FormDataRowView = ({
  row, cols, isTrailer, update, remove, testId,
}: { row: FormDataRow; cols: string; isTrailer: boolean; update: (p: Partial<FormDataRow>) => void; remove: () => void; testId: string }) => {
  const fileCellRef = useRef<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fv = row.value as FileValue;
  return (
    <div data-testid={testId} className="group grid items-center border-b border-border/50 last:border-b-0 hover:bg-hover/30" style={{ gridTemplateColumns: cols }}>
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={row.enabled}
          disabled={isTrailer}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="h-3.5 w-3.5 accent-[var(--color-primary)]"
          data-testid={`${testId}-enabled`}
        />
      </div>
      <div className="border-r border-border/40">
        <VariableInput value={row.key} onChange={(v) => update({ key: v })} placeholder="Key" testId={`${testId}-key`} mode="cell" mono />
      </div>
      <div className="border-r border-border/40 px-1">
        <Select
          value={row.type}
          testId={`${testId}-type`}
          onChange={(v) => {
            const t = v as 'text' | 'file';
            update({ type: t, value: t === 'file' ? { kind: 'none' } as FileValue : '' });
          }}
          options={[{ value: 'text', label: 'Text' }, { value: 'file', label: 'File' }]}
          className="h-7 w-full border-transparent bg-transparent"
        />
      </div>
      <div ref={fileCellRef} className="px-1">
        {row.type === 'text' ? (
          <VariableInput value={row.value as string} onChange={(v) => update({ value: v })} placeholder="Value" testId={`${testId}-value`} mode="cell" mono />
        ) : (
          <div
            data-testid={`${testId}-file-trigger`}
            role="button"
            tabIndex={0}
            onClick={() => setPickerOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPickerOpen(true); }}
            className="flex h-7 w-full cursor-pointer items-center text-left text-[11px]"
          >
            {fv.kind === 'none' ? (
              <span className="rounded px-2 py-1 text-text-muted hover:bg-hover hover:text-primary">Select file</span>
            ) : (
              <FileValueDisplay value={fv} onChange={(v) => update({ value: v })} />
            )}
          </div>
        )}
        {pickerOpen && row.type === 'file' && (
          <FilePickerPopover
            value={fv}
            onChange={(v) => update({ value: v })}
            anchorRef={fileCellRef}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      <div className="flex justify-center">
        {!isTrailer && (
          <button onClick={remove} className="flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-red-500 group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── x-www-form-urlencoded ─── */
const UrlEncodedTable = ({
  rows, onChange,
}: { rows: UrlEncodedRow[]; onChange: (rows: UrlEncodedRow[]) => void }) => {
  const withTrailer = (() => {
    const copy = rows.filter((r) => !(r.key === '' && r.value === ''));
    copy.push(emptyUE());
    return copy;
  })();
  const update = (idx: number, patch: Partial<UrlEncodedRow>) =>
    onChange(withTrailer.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const remove = (idx: number) => {
    if (idx === withTrailer.length - 1) return;
    onChange(withTrailer.filter((_, i) => i !== idx));
  };
  const COLS = '32px minmax(0,1fr) minmax(0,1fr) 28px';
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid items-center border-b border-border bg-surface/60 text-[10px] font-semibold uppercase tracking-wide text-text-muted" style={{ gridTemplateColumns: COLS }}>
        <span /><span className="px-2 py-1.5">Key</span><span className="px-2 py-1.5">Value</span><span />
      </div>
      {withTrailer.map((r, idx) => (
        <div
          key={r.id}
          className="group grid items-center border-b border-border/50 last:border-b-0 hover:bg-hover/30"
          style={{ gridTemplateColumns: COLS }}
          data-testid={`ue-row-${idx}`}
        >
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={r.enabled}
              disabled={idx === withTrailer.length - 1}
              onChange={(e) => update(idx, { enabled: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
          </div>
          <div className="border-r border-border/40"><VariableInput value={r.key} onChange={(v) => update(idx, { key: v })} placeholder="Key" mode="cell" mono /></div>
          <div className="border-r border-border/40"><VariableInput value={r.value} onChange={(v) => update(idx, { value: v })} placeholder="Value" mode="cell" mono /></div>
          <div className="flex justify-center">
            {idx !== withTrailer.length - 1 && (
              <button onClick={() => remove(idx)} className="flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-red-500 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
