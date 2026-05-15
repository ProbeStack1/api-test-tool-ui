/**
 * ExportTab — download the mock in any of 6 formats. Pure presentation
 * over `exportMock` blob fetcher.
 */
import { useState } from 'react';
import { Download, FileJson, Boxes, FileText, FileCode, Activity, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { exportMock, type MockServer, type ExportFormat } from '@/services/mock.service';

const FORMATS: Array<{
  key: ExportFormat; label: string; ext: string; icon: any; tip: string;
}> = [
  { key: 'FORGEQ',       label: 'ForgeFuzz native',         ext: 'ForgeFuzz.json',             icon: Boxes,    tip: 'Best fidelity — round-trippable. Use this when sharing within ForgeFuzz.' },
  { key: 'POSTMAN',      label: 'Postman v2.1',          ext: 'postman_collection.json', icon: FileJson, tip: 'Compatible with Postman desktop & web. Some advanced features (chaos, scenarios) are dropped.' },
  { key: 'OPENAPI',      label: 'OpenAPI 3 (JSON)',      ext: 'openapi.json',            icon: FileText, tip: 'Use for code generation / docs. Validation rules surface as schema constraints.' },
  { key: 'OPENAPI_YAML', label: 'OpenAPI 3 (YAML)',      ext: 'openapi.yaml',            icon: FileCode, tip: 'YAML flavour of OpenAPI 3 — preferred by API gateways and Stoplight.' },
  { key: 'INSOMNIA',     label: 'Insomnia v4',           ext: 'insomnia.json',           icon: Activity, tip: 'Insomnia 4 export — paste straight into Insomnia desktop.' },
  { key: 'HAR',          label: 'HAR 1.2',               ext: 'har',                     icon: FileJson, tip: 'HTTP Archive format — drop into Chrome DevTools or browser-based tools.' },
];

export const ExportTab = ({ mock }: { mock: MockServer }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (fmt: ExportFormat) => {
    try {
      setBusy(fmt);
      const blob = await exportMock(mock.id, fmt);
      const ext = FORMATS.find((f) => f.key === fmt)!.ext;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${mock.slug}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${fmt}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Export failed');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3 p-5" data-testid="mock-export-tab">
      <header>
        <h3 className="text-sm font-semibold">Export this mock</h3>
        <p className="text-[11px] text-text-muted">Pick a format. The download starts immediately.</p>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f) => (
          <div key={f.key} data-testid={`export-card-${f.key.toLowerCase()}`} className="rounded-md border border-border bg-surface/40 p-4">
            <div className="mb-1 flex items-center gap-2">
              <f.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{f.label}</span>
            </div>
            <p className="mb-3 text-[11px] text-text-muted">{f.tip}</p>
            <Button
              variant="outline"
              data-testid={`export-${f.key.toLowerCase()}-btn`}
              disabled={busy === f.key}
              onClick={() => download(f.key)}
            >
              <Download className="h-3.5 w-3.5" /> {busy === f.key ? 'Preparing…' : 'Download'}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[10px] italic text-text-muted">
        <Terminal className="mr-1 inline h-2.5 w-2.5" />
        cURL export is per-request — use the cURL tab in the right rail when running an endpoint.
      </p>
    </div>
  );
};
