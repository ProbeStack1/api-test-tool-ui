/**
 * VariableInput — single-line, table-cell-friendly input that highlights
 * `{{var}}` tokens INLINE (no transparent-text/mirror tricks).
 *
 * Implementation: a `contentEditable` <div> whose children are spans —
 * plain text spans use the default text colour, while each `{{var}}`
 * span gets a status-coloured class. Caret/selection are native.
 *
 * Two visual variants:
 *   • mode='cell'  (default): no border, no padding box, blends into the
 *     surrounding KVTable row exactly the way Postman does.
 *   • mode='boxed': bordered + padded, used for stand-alone fields like
 *     auth values or the URL bar.
 *
 * Hover a variable span → its tooltip pops up showing the resolved value
 * or the env-activation hint, depending on its status.
 *
 * Typing `{{` opens an autocomplete listing the active env's variables.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVariableIndex, VAR_REGEX, STATUS_CLASS, statusTooltip, type VarStatus } from '@/utils/variables';
import { cn } from '@/utils/cn';

export type VariableInputMode = 'cell' | 'boxed';

export interface VariableInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mode?: VariableInputMode;
  mono?: boolean;
  testId?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

/* ── Build coloured spans from the raw string. ───────────────────── */
const buildHTML = (
  value: string,
  lookup: (n: string) => { status: VarStatus; value?: string; envName?: string },
): string => {
  if (value === '') return '';
  const re = new RegExp(VAR_REGEX.source, 'g');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) out += escapeHtml(value.slice(last, m.index));
    const name = m[1];
    const hit = lookup(name);
    const cls = STATUS_CLASS[hit.status];
    const bg =
      hit.status === 'active'   ? 'rgba(255,91,31,0.12)'  :
      hit.status === 'inactive' ? 'rgba(234,179,8,0.12)'  :
                                  'rgba(239,68,68,0.12)';
    /* NOTE: no native `title` attribute — we render our own tooltip in a
     * portal layer so it can carry the matching status colour. */
    out += `<span class="${cls}" data-var="${name}" data-status="${hit.status}" style="background-color:${bg};border-radius:2px;padding:0 1px;cursor:help;">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  if (last < value.length) out += escapeHtml(value.slice(last));
  return out;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const VariableInput = ({
  value, onChange, placeholder, disabled, mode = 'cell',
  mono, testId, className, onFocus, onBlur,
}: VariableInputProps) => {
  const { lookup, activeNames } = useVariableIndex();
  const ref = useRef<HTMLDivElement | null>(null);
  const [acOpen, setAcOpen] = useState(false);
  const [acSel, setAcSel] = useState(0);
  const [hoverVar, setHoverVar] = useState<{ name: string; x: number; y: number } | null>(null);

  /** Sync external value → DOM (only when DIFFERENT, to avoid wiping caret). */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = buildHTML(value, lookup);
    if (el.innerHTML !== html) {
      const wasFocused = document.activeElement === el;
      const caretAtEnd = wasFocused && getCaretOffset(el) === el.textContent?.length;
      el.innerHTML = html;
      if (wasFocused) {
        // Restore caret to end (covers most user-flows; for mid-string edits
        // the user rarely runs into resync mid-keystroke because we *only*
        // resync when the value differs from what they typed).
        if (caretAtEnd) setCaretToEnd(el);
      }
    }
  }, [value, lookup]);

  /* Autocomplete fragment derived from the current caret + value. */
  const ac = useMemo(() => {
    const before = value.slice(0, caretInValue(ref.current, value));
    const open = before.lastIndexOf('{{');
    if (open === -1) return null;
    const frag = before.slice(open + 2);
    if (frag.includes('}}') || !/^[\w.-]*$/.test(frag)) return null;
    return { frag, openIdx: open };
  }, [value]);
  const acMatches = useMemo(() => {
    if (!ac) return [];
    const q = ac.frag.toLowerCase();
    return activeNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [ac, activeNames]);

  const applyAc = (name: string) => {
    if (!ac) return;
    const next = `${value.slice(0, ac.openIdx + 2)}${name}}}${value.slice(caretInValue(ref.current, value))}`;
    onChange(next);
    setAcOpen(false);
    setAcSel(0);
  };

  const onInput = () => {
    const text = ref.current?.innerText ?? '';
    onChange(text);
    setAcOpen(true);
  };

  const isEmpty = value === '';

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="false"
        spellCheck={false}
        data-testid={testId}
        onInput={onInput}
        onMouseOver={(e) => {
          const t = e.target as HTMLElement;
          if (t.dataset?.var) {
            const r = t.getBoundingClientRect();
            setHoverVar({ name: t.dataset.var, x: r.left, y: r.top });
          }
        }}
        onMouseOut={(e) => {
          const t = e.target as HTMLElement;
          if (t.dataset?.var) setHoverVar(null);
        }}
        onFocus={() => { onFocus?.(); }}
        onBlur={() => { setTimeout(() => setAcOpen(false), 120); onBlur?.(); }}
        onKeyUp={() => { setAcOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLDivElement).blur(); return; }
          if (acOpen && acMatches.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAcSel((s) => (s + 1) % acMatches.length); return; }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setAcSel((s) => (s - 1 + acMatches.length) % acMatches.length); return; }
            if (e.key === 'Tab')       { e.preventDefault(); applyAc(acMatches[acSel]); return; }
            if (e.key === 'Escape')    { setAcOpen(false); return; }
          }
        }}
        className={cn(
          'min-h-[28px] w-full whitespace-pre-wrap break-all text-xs text-text-primary outline-none transition-colors',
          mode === 'boxed' && 'h-9 rounded-md border border-border bg-probestack-bg px-3 py-[7px] hover:border-primary/40 focus:border-primary',
          mode === 'cell'  && 'rounded px-2 py-[6px] hover:bg-hover/40 focus:bg-probestack-bg/60',
          mono && 'font-mono',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
      {isEmpty && placeholder && (
        <span
          className={cn(
            'pointer-events-none absolute left-0 top-0 select-none truncate text-xs text-text-muted',
            mode === 'boxed' && 'left-3 top-[7px]',
            mode === 'cell'  && 'left-2 top-[6px]',
            mono && 'font-mono',
          )}
        >
          {placeholder}
        </span>
      )}

      {acOpen && ac && acMatches.length > 0 && (
        <div
          data-testid="var-autocomplete"
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-md border border-border bg-elevated py-1 shadow-xl"
        >
          {acMatches.map((n, i) => (
            <button
              key={n}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyAc(n)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
                i === acSel ? 'bg-primary-muted text-primary' : 'text-text-primary hover:bg-hover',
              )}
            >
              <span className="font-mono text-primary">{`{{${n}}}`}</span>
              <span className="ml-auto truncate text-[10px] text-text-muted">
                {lookup(n).value?.slice(0, 30)}
              </span>
            </button>
          ))}
        </div>
      )}

      {hoverVar && <VarTooltip hit={lookup(hoverVar.name)} name={hoverVar.name} x={hoverVar.x} y={hoverVar.y} />}
    </div>
  );
};

/* Custom in-app tooltip styled with the variable's status color. */
const VarTooltip = ({
  hit, name, x, y,
}: { hit: { status: VarStatus; value?: string; envName?: string }; name: string; x: number; y: number }) => {
  const palette: Record<VarStatus, { bg: string; border: string; fg: string; label: string }> = {
    active:   { bg: 'rgba(255,91,31,0.18)',  border: 'rgba(255,91,31,0.55)',  fg: 'text-primary',     label: 'Active' },
    inactive: { bg: 'rgba(234,179,8,0.18)',  border: 'rgba(234,179,8,0.55)',  fg: 'text-yellow-500',  label: 'Inactive env' },
    missing:  { bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.55)',  fg: 'text-red-500',     label: 'Missing' },
  };
  const p = palette[hit.status];
  /* Render in a portal-ish absolute layer so it can escape clipped parents. */
  return (
    <div
      style={{ position: 'fixed', left: x, top: y - 8, transform: 'translateY(-100%)', backgroundColor: p.bg, borderColor: p.border, zIndex: 2000 }}
      className="pointer-events-none w-64 rounded-md border px-3 py-2 text-[11px] shadow-xl backdrop-blur-md"
    >
      <div className={cn('mb-0.5 flex items-center justify-between gap-2 font-semibold', p.fg)}>
        <span className="font-mono">{`{{${name}}}`}</span>
        <span className="text-[10px] uppercase tracking-wide opacity-80">{p.label}</span>
      </div>
      {hit.status === 'active' && (
        <>
          <div className="text-text-secondary">{hit.envName}</div>
          <div className="mt-0.5 truncate font-mono text-text-primary">= {hit.value}</div>
        </>
      )}
      {hit.status === 'inactive' && (
        <div className="text-text-secondary">
          Present in <span className={p.fg}>{hit.envName}</span>. Activate that environment first.
        </div>
      )}
      {hit.status === 'missing' && (
        <div className="text-text-secondary">No environment variable with this name.</div>
      )}
    </div>
  );
};

/* legacy import alias kept for backwards-compat in tests */
void statusTooltip;

/* ── caret helpers ───────────────────────────────────────────────── */
const getCaretOffset = (el: HTMLElement): number => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
};
const setCaretToEnd = (el: HTMLElement) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};
const caretInValue = (el: HTMLElement | null, value: string): number => {
  if (!el || document.activeElement !== el) return value.length;
  return Math.min(getCaretOffset(el), value.length);
};
