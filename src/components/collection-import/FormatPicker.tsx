/**
 * FormatPicker — compact format chooser.
 *
 * Default state:  a single subtle line
 *    "Detected as <postman_v2_1>  ·  Change"
 *  The user barely notices it — the backend auto-detects and proceeds.
 *
 * Expanded state (after clicking "Change"):
 *    A neat grid of segmented pills for every supported format.
 *    One click switches. "Reset" returns to auto.
 *
 * This module is reusable — the environment-importer and
 * schema-importer will drop it in with the same props.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ImportFormatSpec } from '@/services/collection.service';

export const FormatPicker = ({
  formats, value, onChange, detected,
}: {
  formats: ImportFormatSpec[];
  value: string;
  onChange: (key: string) => void;
  detected?: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);

  // Only the non-auto options are shown in the pill grid.
  const choosable = formats.filter((f) => f.key !== 'auto');
  const detectedLabel = formats.find((f) => f.key === detected)?.label;
  const currentLabel = formats.find((f) => f.key === value)?.label;
  const isAuto = value === 'auto';

  return (
    <div className="space-y-2" data-testid="import-format-picker">
      {/* compact status line */}
      <div className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          {isAuto ? (
            detected && detected !== 'unknown' ? (
              <>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-text-secondary">Detected as</span>
                <span className="truncate font-medium text-text-primary">{detectedLabel ?? detected}</span>
              </>
            ) : (
              <>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
                <span className="text-text-secondary">
                  Couldn't auto-detect — pick a format below
                </span>
              </>
            )
          ) : (
            <>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-text-secondary">Importing as</span>
              <span className="truncate font-medium text-text-primary">{currentLabel}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isAuto && (
            <button
              data-testid="format-reset"
              onClick={() => { onChange('auto'); setExpanded(false); }}
              aria-label="Reset to auto-detect"
              className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-text-muted transition-colors hover:bg-hover hover:text-text-primary"
            >
              <RotateCcw className="h-3 w-3" /> Auto
            </button>
          )}
          <button
            data-testid="format-expand-toggle"
            onClick={() => setExpanded((x) => !x)}
            className="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary-muted"
          >
            {expanded ? <>Done <ChevronUp className="h-3 w-3" /></> : <>Change <ChevronDown className="h-3 w-3" /></>}
          </button>
        </div>
      </div>

      {/* segmented pill grid — only when expanded */}
      {expanded && (
        <div
          data-testid="format-grid"
          className="grid grid-cols-2 gap-1.5 rounded-md border border-dashed border-border p-2"
        >
          {choosable.map((f) => {
            const active = value === f.key;
            const isDetected = detected === f.key;
            return (
              <button
                key={f.key}
                data-testid={`format-opt-${f.key}`}
                onClick={() => onChange(f.key)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors',
                  active
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'border-border text-text-secondary hover:border-primary/40 hover:bg-hover',
                )}
              >
                <span className="truncate">{f.label}</span>
                {isDetected && !active && (
                  <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-green-500">
                    Detected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
