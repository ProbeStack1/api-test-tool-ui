/**
 * KVTable — Postman-parity table for Params & Headers.
 *
 * Layout:
 *   [check]  Key            Value           Description?    [⋯ header menu]
 *   [check]  <input>        <input>         <input>?        [delete row?]
 *   …
 *
 * Header has a single 3-dot menu — clicking → "Show description column"
 * adds a 3rd EQUAL-WIDTH column for every row. Columns swap from
 * 2-equal (Key/Value) to 3-equal (Key/Value/Description) cleanly.
 *
 * Auto-row trailer behaves like Postman: typing into the trailing empty
 * row creates a new empty row below, and the trailing empty row has no
 * delete icon and cannot be removed.
 *
 * Inputs use VariableInput (mode='cell') so they inherit row hover and
 * have NO double-border / inner box look.
 */
import { useMemo, useState } from 'react';
import { Eye, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { VariableInput } from '@/components/ui/VariableInput';
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/ui/DropdownMenu';
import { cn } from '@/utils/cn';

export interface KVRow {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  /** True for auto-generated header rows. Hidden unless eye-icon ON. */
  auto?: boolean;
  /** Optional small pill drawn after the key cell — e.g. "Auth", "Cookie". */
  badge?: string;
  /** When true on a derived row, the user can edit the VALUE inline; the
   *  parent owns the parse-back through `onEditDerived`. */
  editable?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);
export const emptyRow = (): KVRow => ({ id: uid(), key: '', value: '', enabled: true });

export const KVTable = ({
  rows, onChange, autoRows = [], derivedRows = [], onToggleDerived, onEditDerived,
  showDescription = false, onToggleDescription,
  testIdPrefix,
}: {
  rows: KVRow[];
  onChange: (next: KVRow[]) => void;
  autoRows?: KVRow[];
  /** Rows that the table renders ABOVE the user rows. They are not user
   *  data — they're projected from another tab (e.g. Authorization) — but
   *  unlike `autoRows` they ARE toggleable by the user. The owner controls
   *  enable/disable through `onToggleDerived` and (for editable derived
   *  rows) value edits through `onEditDerived`. */
  derivedRows?: KVRow[];
  onToggleDerived?: (rowId: string, enabled: boolean) => void;
  onEditDerived?: (rowId: string, newValue: string) => void;
  showDescription?: boolean;
  onToggleDescription?: (next: boolean) => void;
  testIdPrefix: string;
}) => {
  const [showAuto, setShowAuto] = useState(false);

  const normalized = useMemo(() => {
    const copy = rows.filter((r) => !(r.key === '' && r.value === '' && (r.description ?? '') === ''));
    copy.push(emptyRow());
    return copy;
  }, [rows]);

  const update = (idx: number, patch: Partial<KVRow>) =>
    onChange(normalized.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const remove = (idx: number) => {
    if (idx === normalized.length - 1) return;
    onChange(normalized.filter((_, i) => i !== idx));
  };

  /* Column template — 2 equal cols normally, 3 equal cols when description on. */
  const cols = showDescription
    ? '32px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 28px'
    : '32px minmax(0,1fr) minmax(0,1fr) 28px';

  return (
    <div data-testid={`${testIdPrefix}-table`} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {testIdPrefix === 'headers' ? 'Headers' : 'Query parameters for the request URL'}
        </span>
        <div className="flex items-center gap-1">
          {autoRows.length > 0 && (
            <button
              data-testid={`${testIdPrefix}-toggle-auto`}
              onClick={() => setShowAuto((s) => !s)}
              title={showAuto ? 'Hide auto-generated headers' : `Show ${autoRows.length} auto-generated headers`}
              className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
            >
              {showAuto ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{showAuto ? 'Hide' : 'Show'} auto-generated</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        {/* Header row — has the SINGLE 3-dot menu for the whole table. */}
        <div
          className="grid items-center border-b border-border bg-surface/60 text-[10px] font-semibold uppercase tracking-wide text-text-muted"
          style={{ gridTemplateColumns: cols }}
        >
          <span />
          <span className="px-2 py-1.5">Key</span>
          <span className="px-2 py-1.5">Value</span>
          {showDescription && <span className="px-2 py-1.5">Description</span>}
          <div className="flex justify-center">
            <Dropdown
              side="left"
              align="end"
              trigger={
                <button
                  data-testid={`${testIdPrefix}-table-menu`}
                  aria-label="Table actions"
                  className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              }
            >
              <DropdownLabel>Table</DropdownLabel>
              <DropdownItem
                onClick={() => onToggleDescription?.(!showDescription)}
                data-testid={`${testIdPrefix}-toggle-desc`}
              >
                {showDescription ? 'Hide description column' : 'Show description column'}
              </DropdownItem>
              <DropdownItem
                icon={Trash2}
                destructive
                onClick={() => onChange([])}
                data-testid={`${testIdPrefix}-reset-all`}
              >
                Reset all
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {showAuto && autoRows.map((r) => (
          <RowView
            key={r.id}
            row={{ ...r, enabled: true }}
            disabled
            isAutoRow
            cols={cols}
            showDescription={showDescription}
            onUpdate={() => {}}
            onRemove={() => {}}
            testId={`${testIdPrefix}-auto-${r.key}`}
          />
        ))}

        {/* Derived rows (e.g. Authorization derived from the Auth tab). Not
         *  user-typed data, but the user can still tick / untick the
         *  checkbox to drop the header for one request. The parent owns
         *  the disabled state via `onToggleDerived`. */}
        {derivedRows.map((r) => (
          <RowView
            key={r.id}
            row={r}
            cols={cols}
            isDerivedRow
            derivedEditable={!!r.editable}
            showDescription={showDescription}
            onUpdate={(p) => {
              if (typeof p.enabled === 'boolean') onToggleDerived?.(r.id, p.enabled);
              if (typeof p.value === 'string' && r.editable) onEditDerived?.(r.id, p.value);
            }}
            onRemove={() => onToggleDerived?.(r.id, false)}
            testId={`${testIdPrefix}-derived-${r.key}`}
          />
        ))}

        {normalized.map((r, idx) => (
          <RowView
            key={r.id}
            row={r}
            cols={cols}
            isTrailer={idx === normalized.length - 1}
            showDescription={showDescription}
            onUpdate={(p) => update(idx, p)}
            onRemove={() => remove(idx)}
            testId={`${testIdPrefix}-row-${idx}`}
          />
        ))}
      </div>
    </div>
  );
};

const RowView = ({
  row, cols, onUpdate, onRemove, isTrailer, disabled, isAutoRow, isDerivedRow, derivedEditable, showDescription, testId,
}: {
  row: KVRow;
  cols: string;
  onUpdate: (p: Partial<KVRow>) => void;
  onRemove: () => void;
  isTrailer?: boolean;
  disabled?: boolean;
  isAutoRow?: boolean;
  isDerivedRow?: boolean;
  derivedEditable?: boolean;
  showDescription: boolean;
  testId: string;
}) => (
  <div
    data-testid={testId}
    className={cn(
      'group grid items-center border-b border-border/50 last:border-b-0 hover:bg-hover/30',
      /* Auto rows (e.g. Accept-Encoding) are readonly and slightly faded. */
      isAutoRow && 'bg-primary/[0.04] italic text-text-secondary hover:bg-primary/[0.06]',
      /* Derived rows (e.g. Authorization from the Auth tab) look like
       * normal user rows — same colour, same weight — but carry a small
       * pill so users know where the value originates. */
      disabled && !isAutoRow && !isDerivedRow && 'opacity-60',
    )}
    style={{ gridTemplateColumns: cols }}
  >
    <div className="flex justify-center">
      <input
        type="checkbox"
        disabled={isAutoRow || isTrailer}
        checked={row.enabled}
        onChange={(e) => onUpdate({ enabled: e.target.checked })}
        className="h-3.5 w-3.5 accent-[var(--color-primary)]"
        data-testid={`${testId}-enabled`}
      />
    </div>
    <CellInput
      value={row.key}
      onChange={(v) => onUpdate({ key: v })}
      placeholder={isTrailer ? 'Key' : 'Key'}
      /* Key is always read-only on derived rows — even when value is
       * editable — to avoid confusing the user about which auth type is
       * active. They change the auth type via the Auth tab dropdown. */
      disabled={disabled || isDerivedRow}
      testId={`${testId}-key`}
      trailingBadge={isAutoRow ? 'auto' : (isDerivedRow ? (row.badge ?? 'Auth') : undefined)}
      badgeTitle={isAutoRow ? 'Auto-added by HTTP client' : 'Linked to the Authorization tab — edits sync both ways'}
    />
    <CellInput
      value={row.value}
      onChange={(v) => onUpdate({ value: v })}
      placeholder="Value"
      /* Derived value: read-only ONLY when the auth type can't be
       * round-tripped (digest/awsv4/etc). Editable types (bearer/basic/
       * apikey/oauth2) accept inline edits and feed them back into the
       * Auth tab via parseAuthRowEdit on the parent. */
      disabled={disabled || (isDerivedRow && !derivedEditable)}
      testId={`${testId}-value`}
    />
    {showDescription && (
      <CellInput
        value={row.description ?? ''}
        onChange={(v) => onUpdate({ description: v })}
        placeholder="Description"
        disabled={disabled || isDerivedRow}
        testId={`${testId}-description`}
      />
    )}
    <div className="flex justify-center">
      {!isTrailer && !disabled && !isAutoRow && !isDerivedRow && (
        <button
          onClick={onRemove}
          data-testid={`${testId}-delete`}
          aria-label="Delete row"
          className="flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  </div>
);

/* Cell-style border-less variable input (used by every column). */
const CellInput = ({
  value, onChange, placeholder, disabled, testId, trailingBadge, badgeTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  trailingBadge?: string;
  badgeTitle?: string;
}) => (
  <div className="flex items-center border-r border-border/40 last:border-r-0">
    <div className="min-w-0 flex-1">
      <VariableInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        testId={testId}
        mode="cell"
        mono
      />
    </div>
    {trailingBadge && (
      <span
        className="mr-2 shrink-0 rounded-sm border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wider not-italic text-primary/80"
        title={badgeTitle ?? 'Auto-generated'}
      >
        {trailingBadge}
      </span>
    )}
  </div>
);
