/**
 * CatalogPane — read-only event reference with click-to-preview payloads.
 *
 * Each event row expands inline to reveal the exact JSON envelope ForgeQ
 * will POST to your webhook endpoint for that event type — headers, body,
 * HMAC signature instructions. Users don't need to wait for a real event
 * to see what to parse on their side.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { eventCatalog } from '@/services/iwh.service';
import { samplePayloadFor } from './samplePayloads';
import { FancyEmpty } from '@/components/common/FancyEmpty';
import { cn } from '@/utils/cn';

const SEVERITY_TONE: Record<string, string> = {
  INFO:     'border-border bg-elevated text-text-muted',
  WARN:     'border-amber-500/30 bg-amber-500/10 text-amber-400',
  CRITICAL: 'border-danger/30 bg-danger/10 text-danger',
};

export const CatalogPane = () => {
  const q = useQuery({ queryKey: ['iwh', 'catalog'], queryFn: eventCatalog });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (t: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(t) ? next.delete(t) : next.add(t);
    return next;
  });
  const events = q.data?.events ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="iwh-catalog">
      <header className="flex items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="text-base font-semibold">Event catalog</h1>
        <span className="text-[11px] text-text-muted">· Click any event to see the exact payload you'll receive</span>
        <span className="ml-auto text-[10px] text-text-muted">{events.length} events</span>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {q.isLoading ? (
          <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-text-muted" />
        ) : events.length === 0 ? (
          <FancyEmpty
            testId="iwh-catalog-empty"
            icon="apidoc"
            title="Event catalog is empty"
            body="The backend hasn't registered any event types yet. Once it does, they'll appear here with sample payloads."
          />
        ) : (
          <ul className="space-y-2" data-testid="iwh-catalog-list">
            {events.map((ev) => {
              const sev = ev.sampleSeverity ?? 'INFO';
              const isOpen = expanded.has(ev.type);
              return (
                <li key={ev.type} data-testid={`iwh-catalog-event-${ev.type}`}
                  className={cn(
                    'rounded-xl border bg-surface/40 transition-colors',
                    isOpen ? 'border-primary/40' : 'border-border hover:border-primary/30',
                  )}>
                  <button
                    onClick={() => toggle(ev.type)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    data-testid={`iwh-catalog-event-toggle-${ev.type}`}
                  >
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-90')}
                    />
                    <h3 className="flex-1 truncate font-mono text-[12px] font-semibold text-primary">{ev.type}</h3>
                    <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider', SEVERITY_TONE[sev] ?? SEVERITY_TONE.INFO)}>
                      {sev}
                    </span>
                  </button>
                  {isOpen && <PayloadPreview type={ev.type} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const PayloadPreview = ({ type }: { type: string }) => {
  const [copied, setCopied] = useState(false);
  const body = samplePayloadFor(type);
  const onCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    toast.success('Payload copied');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="border-t border-border/60 bg-probestack-bg/40 px-3 py-3" data-testid={`iwh-catalog-payload-${type}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Sample POST body
        </span>
        <span className="font-mono text-[9px] text-text-muted">Content-Type: application/json</span>
        <span className="font-mono text-[9px] text-text-muted">+ X-ForgeFuzz-Signature header</span>
        <Button size="sm" variant="ghost" onClick={onCopy} className="ml-auto" data-testid={`iwh-catalog-copy-${type}`}>
          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto rounded-md border border-border bg-probestack-bg p-3 font-mono text-[10.5px] leading-snug text-text-secondary">
        {body}
      </pre>
      <p className="mt-2 font-mono text-[10px] text-text-muted">
        Verify:{' '}
        <code className="rounded bg-elevated px-1">hex_hmac_sha256(signing_secret, raw_body) === X-ForgeFuzz-Signature</code>
      </p>
    </div>
  );
};
