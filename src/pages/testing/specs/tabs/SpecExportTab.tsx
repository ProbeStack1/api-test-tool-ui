/**
 * SpecExportTab — 4 download cards for the supported export formats.
 * Each click streams the binary blob from
 * `GET /api/v1/test-specs/{id}/export?format=…` and saves it via the
 * `Content-Disposition` filename.
 */
import { useState } from 'react';
import { Download, Loader2, FileJson, Server, FileCog, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  exportTestSpec, downloadExportBlob,
  type ExportFormat, type TestSpec,
} from '@/services/testSpec.service';

interface Props { spec: TestSpec }

const CARDS: { fmt: ExportFormat; icon: any; tone: string; description: string }[] = [
  { fmt: 'FORGEQ',   icon: Layers,    tone: 'text-primary',         description: 'Native ForgeFuzz JSON — round-trips losslessly with this app.' },
  { fmt: 'POSTMAN',  icon: Server,    tone: 'text-orange-400',     description: 'Postman v2.1 collection — drop straight into Postman or Newman.' },
  { fmt: 'OPENAPI',  icon: FileJson,  tone: 'text-blue-400',       description: 'OpenAPI 3.0 YAML — paste into Swagger UI or codegen.' },
  { fmt: 'INSOMNIA', icon: FileCog,   tone: 'text-purple-400',     description: 'Insomnia v4 export — open in Insomnia / Kong portal.' },
];

export const SpecExportTab = ({ spec }: Props) => {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async (fmt: ExportFormat) => {
    setError(null);
    setBusy(fmt);
    try {
      const { blob, contentDisposition } = await exportTestSpec(spec.testSpecId, fmt);
      downloadExportBlob(blob, contentDisposition, `${spec.name}.${fmt.toLowerCase()}.json`);
    } catch (e: any) {
      setError(e?.message ?? 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 p-6" data-testid="spec-export-tab">
      <p className="text-[11px] text-text-muted">
        Export this test spec as a portable file. The Java service serializes from the canonical
        in-memory document so the round-trip is lossless within the same format family.
      </p>

      {error && (
        <p data-testid="spec-export-error" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <div
            key={c.fmt}
            data-testid={`spec-export-card-${c.fmt.toLowerCase()}`}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface/40 p-4"
          >
            <div className="flex items-center gap-2">
              <c.icon className={`h-4 w-4 ${c.tone}`} />
              <span className="text-sm font-semibold tracking-tight">{c.fmt}</span>
            </div>
            <p className="flex-1 text-[11px] leading-relaxed text-text-muted">{c.description}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(c.fmt)}
              disabled={busy !== null}
              data-testid={`spec-export-btn-${c.fmt.toLowerCase()}`}
            >
              {busy === c.fmt
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
