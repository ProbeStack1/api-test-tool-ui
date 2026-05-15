/**
 * JsonDiffView — minimal side-by-side JSON diff dialog. No external deps.
 *
 * The diff is computed line-by-line on pretty-printed JSON which is good
 * enough for casual eyeballing during demos. Heavy diff libraries (jsdiff,
 * deep-diff) are intentionally avoided to keep the bundle lean.
 */
import { useMemo } from 'react';
import { X, GitCompare } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Side { label: string; data: any }
type Op = 'eq' | 'add' | 'del';
interface Row { op: Op; left?: string; right?: string }

const toLines = (v: any): string[] => {
  try {
    if (v == null) return ['—'];
    return (typeof v === 'string' ? v : JSON.stringify(v, null, 2)).split('\n');
  } catch { return [String(v)]; }
};

/** Trivial Myers-light diff: greedy alignment by hashing. */
const diff = (la: string[], lb: string[]): Row[] => {
  const seen = new Map<string, number[]>();
  lb.forEach((line, i) => {
    if (!seen.has(line)) seen.set(line, []);
    seen.get(line)!.push(i);
  });
  const rows: Row[] = [];
  let j = 0;
  for (let i = 0; i < la.length; i++) {
    const positions = seen.get(la[i]) ?? [];
    const next = positions.find((p) => p >= j);
    if (next !== undefined) {
      // Treat lines on the right that we skipped as additions.
      while (j < next) { rows.push({ op: 'add', right: lb[j] }); j++; }
      rows.push({ op: 'eq', left: la[i], right: lb[j] });
      j++;
    } else {
      rows.push({ op: 'del', left: la[i] });
    }
  }
  while (j < lb.length) { rows.push({ op: 'add', right: lb[j] }); j++; }
  return rows;
};

export const JsonDiffView = ({ left, right, onClose }: { left: Side; right: Side; onClose: () => void }) => {
  const rows = useMemo(() => diff(toLines(left.data), toLines(right.data)), [left.data, right.data]);
  const adds = rows.filter((r) => r.op === 'add').length;
  const dels = rows.filter((r) => r.op === 'del').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="json-diff-view">
      <div className="flex h-[80vh] max-h-[800px] w-full max-w-6xl flex-col rounded-lg border border-border bg-elevated shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface/60 px-4 py-2.5">
          <GitCompare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">JSON diff</h3>
          <span className="font-mono text-[10px] text-text-muted">
            <span className="text-success">+{adds}</span> <span className="text-danger">−{dels}</span>
          </span>
          <button className="ml-auto" onClick={onClose} data-testid="json-diff-close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="grid shrink-0 grid-cols-2 gap-px border-b border-border bg-border text-[10px]">
          <div className="bg-surface/40 px-3 py-1.5 font-semibold text-text-secondary">A · {left.label}</div>
          <div className="bg-surface/40 px-3 py-1.5 font-semibold text-text-secondary">B · {right.label}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto font-mono text-[10px] leading-relaxed">
          <table className="w-full">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={cn(
                  r.op === 'eq'  && 'bg-transparent',
                  r.op === 'del' && 'bg-danger/10',
                  r.op === 'add' && 'bg-success/10',
                )}>
                  <td className={cn('w-[50%] whitespace-pre px-2 align-top',
                    r.op === 'del' && 'text-danger',
                  )}>{r.left ?? ''}</td>
                  <td className={cn('w-[50%] whitespace-pre border-l border-border px-2 align-top',
                    r.op === 'add' && 'text-success',
                  )}>{r.right ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
