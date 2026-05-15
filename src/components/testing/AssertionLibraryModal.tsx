/**
 * AssertionLibraryModal — pre-canned assertions picker for the Test Spec
 * editor (Task 3.10).
 *
 * Flow: open modal → pick category tab → click an assertion card →
 * `onPick` callback fires with the assertion's template expression so
 * the caller can append it to the spec-step's assertion list.
 */
import { useMemo, useState } from 'react';
import { Search, X, Library, ChevronRight, Copy } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  BUILTIN_ASSERTIONS, ASSERTION_CATEGORIES, type AssertionCategory, type BuiltInAssertion,
} from '@/pages/testing/library/builtinAssertions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when the user picks an assertion. The host inserts the template. */
  onPick: (assertion: BuiltInAssertion) => void;
}

export function AssertionLibraryModal({ open, onClose, onPick }: Props) {
  const [activeCat, setActiveCat] = useState<AssertionCategory>('status');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return BUILTIN_ASSERTIONS.filter((a) => {
      if (a.category !== activeCat) return false;
      if (!q) return true;
      return (
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [activeCat, filter]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      data-testid="assertion-library-modal"
    >
      <div className="flex max-h-[80vh] w-[820px] max-w-[95vw] flex-col rounded-lg border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Assertions library</span>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
              {BUILTIN_ASSERTIONS.length} built-ins
            </span>
          </div>
          <button data-testid="assertion-library-close" onClick={onClose} className="rounded p-1 hover:bg-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter row */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="assertion-search"
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search assertions…"
              className="w-full rounded-md border border-border bg-transparent py-1.5 pl-8 pr-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Body: tabs left, cards right */}
        <div className="flex h-0 flex-1">
          {/* Category tabs */}
          <div className="w-40 shrink-0 border-r border-border p-2">
            {ASSERTION_CATEGORIES.map((c) => {
              const count = BUILTIN_ASSERTIONS.filter((a) => a.category === c.id).length;
              return (
                <button
                  key={c.id}
                  data-testid={`assertion-cat-${c.id}`}
                  onClick={() => setActiveCat(c.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs',
                    activeCat === c.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-hover',
                  )}
                >
                  <span>{c.label}</span>
                  <span className="rounded-full bg-elevated px-1.5 py-0 text-[9px] text-text-muted">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-3" data-testid="assertion-card-list">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-text-muted">
                No assertions match your filter.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2">
                {filtered.map((a) => (
                  <li key={a.id}>
                    <button
                      data-testid={`assertion-pick-${a.id}`}
                      onClick={() => { onPick(a); onClose(); }}
                      className="group w-full rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-hover/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.label}</span>
                          <span className="rounded bg-elevated px-1.5 py-0 text-[9px] uppercase text-text-muted">{a.category}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-1 text-[11px] text-text-muted">{a.description}</p>
                      <pre className="mt-2 overflow-x-auto rounded bg-probestack-bg/40 p-2 font-mono text-[10px] text-text-secondary">
                        {a.template}
                      </pre>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-2 text-[10px] text-text-muted">
          Click any card to insert it into the current step. You can edit
          the expression after insertion.
        </div>
      </div>
    </div>
  );
}

export default AssertionLibraryModal;
