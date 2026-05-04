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
}

const uid = () => Math.random().toString(36).slice(2, 10);
export const emptyRow = (): KVRow => ({ id: uid(), key: '', value: '', enabled: true });

export const KVTable = ({
  rows, onChange, autoRows = [], showDescription = false, onToggleDescription,
  testIdPrefix,
}: {
  rows: KVRow[];
  onChange: (next: KVRow[]) => void;
  autoRows?: KVRow[];
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
            cols={cols}
            showDescription={showDescription}
            onUpdate={() => {}}
            onRemove={() => {}}
            testId={`${testIdPrefix}-auto-${r.key}`}
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
  row, cols, onUpdate, onRemove, isTrailer, disabled, showDescription, testId,
}: {
  row: KVRow;
  cols: string;
  onUpdate: (p: Partial<KVRow>) => void;
  onRemove: () => void;
  isTrailer?: boolean;
  disabled?: boolean;
  showDescription: boolean;
  testId: string;
}) => (
  <div
    data-testid={testId}
    className={cn(
      'group grid items-center border-b border-border/50 last:border-b-0 hover:bg-hover/30',
      disabled && 'opacity-60',
    )}
    style={{ gridTemplateColumns: cols }}
  >
    <div className="flex justify-center">
      <input
        type="checkbox"
        disabled={disabled || isTrailer}
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
      disabled={disabled}
      testId={`${testId}-key`}
    />
    <CellInput
      value={row.value}
      onChange={(v) => onUpdate({ value: v })}
      placeholder="Value"
      disabled={disabled}
      testId={`${testId}-value`}
    />
    {showDescription && (
      <CellInput
        value={row.description ?? ''}
        onChange={(v) => onUpdate({ description: v })}
        placeholder="Description"
        disabled={disabled}
        testId={`${testId}-description`}
      />
    )}
    <div className="flex justify-center">
      {!isTrailer && !disabled && (
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
  value, onChange, placeholder, disabled, testId,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; testId?: string }) => (
  <div className="border-r border-border/40 last:border-r-0">
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
);
