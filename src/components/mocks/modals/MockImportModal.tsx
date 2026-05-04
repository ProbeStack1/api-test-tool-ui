/**
 * MockImportModal — 6-format spec import.
 *
 * Drag-drop a Postman v2.1 / OpenAPI 3 (JSON) / Insomnia v4 / HAR 1.2 /
 * ForgeQ-native / cURL file. The modal:
 *  1) Reads the file (≤ 5 MB).
 *  2) Detects the format client-side AND lets the user override via
 *     a chip picker (Auto-detect highlighted with the detected badge).
 *  3) Shows file name, size (KB/MB), MIME, full content preview.
 *  4) On Import → POSTs to `/mocks/import?forceFormat=…` and routes to
 *     the new mock detail page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileJson, AlertTriangle, Check, Loader2, X as XIcon,
  Boxes, FileText, Activity, Terminal, Sparkles, FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { importMockAuto } from '@/services/mock.service';
import { cn } from '@/utils/cn';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT = '.json,.yaml,.yml,.har,.txt,.sh,.curl';

type FormatKey =
  | 'AUTO' | 'POSTMAN' | 'OPENAPI' | 'INSOMNIA' | 'HAR' | 'FORGEQ' | 'CURL';

interface FormatSpec {
  key: FormatKey;
  label: string;
  icon: any;
  extensions: string[];
  hint: string;
}

const FORMATS: FormatSpec[] = [
  { key: 'AUTO',     label: 'Auto-detect',         icon: Sparkles, extensions: ['.json','.yaml','.yml','.har','.txt'], hint: 'We sniff the file format from its contents.' },
  { key: 'POSTMAN',  label: 'Postman v2.1',        icon: FileJson, extensions: ['.json','.postman_collection.json'],   hint: 'Postman exported collections.' },
  { key: 'OPENAPI',  label: 'OpenAPI 3',           icon: FileText, extensions: ['.json','.yaml','.yml'],               hint: 'OpenAPI / Swagger 3.x specs.' },
  { key: 'INSOMNIA', label: 'Insomnia v4',         icon: Activity, extensions: ['.json'],                              hint: 'Insomnia 4.x export bundle.' },
  { key: 'HAR',      label: 'HAR 1.2',             icon: FileCode, extensions: ['.har','.json'],                       hint: 'Browser network archive (HAR).' },
  { key: 'FORGEQ',   label: 'ForgeQ native',       icon: Boxes,    extensions: ['.json','.forgeq.json'],               hint: 'Round-trippable ForgeQ export.' },
  { key: 'CURL',     label: 'cURL command',        icon: Terminal, extensions: ['.txt','.sh','.curl'],                 hint: 'A single cURL line — we\'ll seed one endpoint.' },
];

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const detectFormat = (text: string): FormatKey => {
  if (/^\s*curl\s/m.test(text)) return 'CURL';
  try {
    const j = JSON.parse(text);
    if (j && j.info && Array.isArray(j.item))                            return 'POSTMAN';
    if (j && (j.openapi || j.swagger))                                   return 'OPENAPI';
    if (j && j._type === 'export' && [3, 4].includes(j.__export_format)) return 'INSOMNIA';
    if (j && j.log && Array.isArray(j.log.entries))                      return 'HAR';
    if (j && j.mock && Array.isArray(j.endpoints))                       return 'FORGEQ';
  } catch { /* not JSON */ }
  if (/^(openapi|swagger):/m.test(text)) return 'OPENAPI';
  return 'AUTO';
};

const guessName = (text: string, fmt: FormatKey): string => {
  try {
    const j = JSON.parse(text);
    if (fmt === 'POSTMAN') return j.info?.name ?? 'Postman import';
    if (fmt === 'OPENAPI') return j.info?.title ?? 'OpenAPI import';
    if (fmt === 'INSOMNIA') return 'Insomnia import';
    if (fmt === 'HAR') return 'HAR import';
    if (fmt === 'FORGEQ') return j.mock?.name ?? 'ForgeQ import';
  } catch { /* not JSON */ }
  if (fmt === 'CURL') return 'cURL import';
  return 'Imported mock';
};

export const MockImportModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [detected, setDetected] = useState<FormatKey>('AUTO');
  const [chosen, setChosen] = useState<FormatKey>('AUTO');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null); setContent(''); setDetected('AUTO'); setChosen('AUTO');
      setName(''); setErr(null);
    }
  }, [open]);

  const acceptAttr = useMemo(
    () => Array.from(new Set(FORMATS.flatMap((f) => f.extensions))).join(','),
    [],
  );

  const pick = async (f: File) => {
    setErr(null);
    if (f.size > MAX_BYTES) {
      setErr(`File too large (${fmtBytes(f.size)}). Max 5 MB.`);
      return;
    }
    let text = '';
    try { text = await f.text(); } catch { setErr('Could not read file'); return; }
    const d = detectFormat(text);
    setFile(f); setContent(text); setDetected(d); setChosen(d === 'AUTO' ? 'AUTO' : d);
    if (!name) setName(guessName(text, d));
  };

  const clearFile = () => {
    setFile(null); setContent(''); setDetected('AUTO'); setChosen('AUTO');
    setErr(null); setName('');
  };

  if (!open) return null;

  const submit = async () => {
    if (!ws || !file || !content) return;
    try {
      setBusy(true);
      const force = chosen === 'AUTO' ? undefined : chosen;
      const m = await importMockAuto(ws.id, content, { name: name.trim() || undefined, forceFormat: force });
      toast.success(`Imported as ${m.name}`);
      await qc.invalidateQueries({ queryKey: ['mocks', ws.id] });
      onClose();
      if ((m as any)?.id) nav(`/projects/mocks/${(m as any).id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import mock server"
      icon={UploadCloud}
      size="lg"
      testId="mock-import-modal"
      footer={
        <>
          <Button variant="outline" data-testid="mock-import-cancel" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            data-testid="mock-import-submit"
            disabled={busy || !file}
            onClick={submit}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Import as mock
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          data-testid="mock-import-file-input"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.currentTarget.value = ''; }}
        />

        {!file ? (
          <div
            data-testid="mock-import-dropzone"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-12 text-center transition-colors',
              dragOver ? 'border-primary bg-primary-muted' : 'border-border hover:border-primary/60 hover:bg-hover/50',
            )}
          >
            <UploadCloud className="h-10 w-10 text-text-muted" />
            <div className="text-sm font-medium text-text-primary">Drop your file here, or click to browse</div>
            <div className="text-xs text-text-muted">
              Postman v2.1 · OpenAPI 3 · Insomnia v4 · HAR 1.2 · ForgeQ-native · cURL
            </div>
            <div className="mt-1 text-[10px] text-text-muted">Max 5 MB · {acceptAttr}</div>
          </div>
        ) : (
          <>
            {/* File card */}
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface/40 p-3" data-testid="mock-import-file-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-muted text-primary">
                <FileJson className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary" data-testid="mock-import-file-name">{file.name}</div>
                <div className="text-[11px] text-text-muted" data-testid="mock-import-file-size">
                  {fmtBytes(file.size)} · {file.type || 'text/plain'}
                </div>
              </div>
              {detected !== 'AUTO' && (
                <span data-testid="mock-import-format-badge" className="rounded-md border border-success/40 bg-success-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  detected: {detected}
                </span>
              )}
              <button
                onClick={clearFile}
                data-testid="mock-import-file-clear"
                aria-label="Remove file"
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover hover:text-danger"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Format chip picker — Auto highlighted with detected badge */}
            <div data-testid="mock-import-format-picker">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Format</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FORMATS.map((f) => {
                  const active = chosen === f.key;
                  const isDetected = f.key === detected && detected !== 'AUTO';
                  return (
                    <button
                      key={f.key}
                      type="button"
                      data-testid={`mock-import-fmt-${f.key.toLowerCase()}`}
                      onClick={() => setChosen(f.key)}
                      className={cn(
                        'group relative flex items-start gap-2 rounded-md border p-2.5 text-left transition-colors',
                        active ? 'border-primary bg-primary/5'
                               : 'border-border bg-probestack-bg hover:border-primary/40 hover:bg-hover',
                      )}
                    >
                      <f.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-text-muted')} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('flex items-center gap-1 text-[11px] font-semibold', active ? 'text-primary' : 'text-text-primary')}>
                          {f.label}
                          {isDetected && (
                            <span className="rounded bg-success-muted px-1 text-[8px] font-bold text-success">DETECTED</span>
                          )}
                          {f.key === 'AUTO' && detected === 'AUTO' && (
                            <span className="rounded bg-warning-muted px-1 text-[8px] font-bold text-warning">UNKNOWN</span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted">{f.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content preview */}
            <div data-testid="mock-import-content-preview">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">File content (preview)</span>
                <span className="font-mono text-[10px] text-text-muted">{content.length.toLocaleString()} chars</span>
              </div>
              <pre data-testid="mock-import-content-pre" className="max-h-56 overflow-auto rounded-md border border-border bg-probestack-bg/60 p-3 font-mono text-[11px] leading-relaxed text-text-secondary">
                {(content ?? '').slice(0, 4000)}
                {content.length > 4000 && '\n\n… (truncated — full file will be uploaded)'}
              </pre>
            </div>

            {/* Mock name */}
            <div data-testid="mock-import-name-row">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Mock name</div>
              <input
                data-testid="mock-import-name"
                className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-text-primary outline-none focus:border-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto from file"
              />
            </div>
          </>
        )}

        {err && (
          <div data-testid="mock-import-error" className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-muted p-3 text-[11px] text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5" /> {err}
          </div>
        )}
      </div>
    </Modal>
  );
};
