/**
 * Shared utilities for API Docs sub-components — kept in one tiny module so
 * the main page and its split-out children agree on input styles, label
 * shape, and Markdown rendering. Don't dump unrelated helpers here.
 */
import { marked } from 'marked';

// Configure marked once — GitHub-flavoured-ish, line breaks honoured.
marked.setOptions({ breaks: true, gfm: true });

export const renderMarkdown = (md: string): string => {
  try { return marked.parse(md ?? '', { async: false }) as string; }
  catch { return ''; }
};

/** Default input className used across every <input>/<select> in this surface. */
export const cls = (): string =>
  'h-9 w-full rounded-md border border-border bg-probestack-bg px-3 text-xs shadow-inner';

export const Field = ({
  label, hint, children, required,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-tight text-text-secondary">
      {label} {required && <span className="text-danger">*</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[10px] text-text-muted">{hint}</span>}
  </label>
);
