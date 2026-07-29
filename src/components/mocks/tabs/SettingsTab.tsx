/**
 * SettingsTab — server-level config: latency, proxy, CORS, rate-limit,
 * record-mode. All edits are batched and saved on click "Save".
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Power, Globe, Gauge, ShieldOff, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { updateMock, type MockServer } from '@/services/mock.service';
import { cn } from '@/utils/cn';

interface LatencyCfg { mode?: string; delayMs?: number; minMs?: number; maxMs?: number; meanMs?: number; stddevMs?: number; }
interface ProxyCfg   { enabled?: boolean; upstreamUrl?: string; fallbackOnly?: boolean; captureAsMock?: boolean; }
interface CorsCfg    { allowedOrigins?: string[]; allowCredentials?: boolean; }
interface RateCfg    { enabled?: boolean; requestsPerWindow?: number; windowSeconds?: number; emitHeaders?: boolean; }

export const SettingsTab = ({ mock }: { mock: MockServer }) => {
  const qc = useQueryClient();
  const [latency, setLatency] = useState<LatencyCfg>((mock.latency as LatencyCfg) ?? { mode: 'FIXED', delayMs: 0 });
  const [proxy, setProxy]     = useState<ProxyCfg>((mock.proxy as ProxyCfg)     ?? { enabled: false, fallbackOnly: true });
  const [cors, setCors]       = useState<CorsCfg>((mock.cors as CorsCfg)        ?? { allowedOrigins: ['*'], allowCredentials: false });
  const [rate, setRate]       = useState<RateCfg>((mock.rateLimit as RateCfg)   ?? { enabled: false, requestsPerWindow: 100, windowSeconds: 60 });
  const [record, setRecord]   = useState<boolean>(!!mock.recordMode);

  const save = useMutation({
    mutationFn: () => updateMock(mock.id, {
      latency: latency as any, proxy: proxy as any, cors: cors as any, rateLimit: rate as any, recordMode: record,
    } as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mock', mock.id] });
      await qc.invalidateQueries({ queryKey: ['mocks'] });
      toast.success('Settings saved');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  return (
    <div className="space-y-4 p-5" data-testid="mock-settings-tab">
      {/* Latency */}
      <Section icon={Gauge} title="Latency" description="Inject artificial delay before responding to simulate slow backends.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            data-testid="settings-latency-mode"
            className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs"
            value={latency.mode || 'FIXED'}
            onChange={(e) => setLatency({ ...latency, mode: e.target.value })}
          >
            <option value="FIXED">Fixed</option>
            <option value="RANGE">Range</option>
            <option value="NORMAL">Normal distribution</option>
          </select>
          {latency.mode === 'FIXED' && (
            <NumInput testId="settings-latency-delay" placeholder="Delay (ms)" value={latency.delayMs} onChange={(v) => setLatency({ ...latency, delayMs: v })} />
          )}
          {latency.mode === 'RANGE' && (
            <>
              <NumInput testId="settings-latency-min" placeholder="Min (ms)" value={latency.minMs} onChange={(v) => setLatency({ ...latency, minMs: v })} />
              <NumInput testId="settings-latency-max" placeholder="Max (ms)" value={latency.maxMs} onChange={(v) => setLatency({ ...latency, maxMs: v })} />
            </>
          )}
          {latency.mode === 'NORMAL' && (
            <>
              <NumInput testId="settings-latency-mean" placeholder="Mean (ms)" value={latency.meanMs} onChange={(v) => setLatency({ ...latency, meanMs: v })} />
              <NumInput testId="settings-latency-stddev" placeholder="Stddev" value={latency.stddevMs} onChange={(v) => setLatency({ ...latency, stddevMs: v })} />
            </>
          )}
        </div>
      </Section>

      {/* Proxy */}
      <Section icon={Globe} title="Proxy fallback" description="Forward unmatched requests to a real upstream. Optional record-replay captures their responses as new endpoints.">
        <Toggle testId="settings-proxy-enabled" label="Enable proxy" value={!!proxy.enabled} onChange={(v) => setProxy({ ...proxy, enabled: v })} />
        {proxy.enabled && (
          <div className="space-y-2 pl-5">
            <input
              data-testid="settings-proxy-upstream"
              className="h-7 w-full rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs"
              placeholder="https://api.example.com"
              value={proxy.upstreamUrl || ''}
              onChange={(e) => setProxy({ ...proxy, upstreamUrl: e.target.value })}
            />
            <Toggle testId="settings-proxy-fallback" label="Forward only when no rule matches" value={proxy.fallbackOnly !== false} onChange={(v) => setProxy({ ...proxy, fallbackOnly: v })} />
            <Toggle testId="settings-proxy-capture" label="Capture proxied responses as new endpoints" value={!!proxy.captureAsMock} onChange={(v) => setProxy({ ...proxy, captureAsMock: v })} />
          </div>
        )}
      </Section>

      {/* CORS */}
      <Section icon={Globe} title="CORS" description="Cross-origin policy. Public mocks always serve wide-open CORS regardless of these settings.">
        <input
          data-testid="settings-cors-origins"
          className="h-7 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs"
          placeholder="Allowed origins (comma-separated, * for all)"
          value={(cors.allowedOrigins || []).join(',')}
          onChange={(e) => setCors({ ...cors, allowedOrigins: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
        <Toggle testId="settings-cors-creds" label="Allow credentials" value={!!cors.allowCredentials} onChange={(v) => setCors({ ...cors, allowCredentials: v })} />
      </Section>

      {/* Rate limit */}
      <Section icon={ShieldOff} title="Rate limit" description="Token-bucket per remote IP. When exceeded, runtime returns 429 with X-RateLimit-* headers.">
        <Toggle testId="settings-rate-enabled" label="Enable rate-limit" value={!!rate.enabled} onChange={(v) => setRate({ ...rate, enabled: v })} />
        {rate.enabled && (
          <div className="grid grid-cols-3 gap-2 pl-5">
            <NumInput testId="settings-rate-rpw" placeholder="Requests / window" value={rate.requestsPerWindow} onChange={(v) => setRate({ ...rate, requestsPerWindow: v })} />
            <NumInput testId="settings-rate-window" placeholder="Window (s)" value={rate.windowSeconds} onChange={(v) => setRate({ ...rate, windowSeconds: v })} />
            <Toggle testId="settings-rate-emit" label="Emit X-RateLimit-* headers" value={rate.emitHeaders !== false} onChange={(v) => setRate({ ...rate, emitHeaders: v })} />
          </div>
        )}
      </Section>

      {/* Record mode — disabled because backend implementation is not yet available */}
      {/* 
      <Section icon={Pin} title="Record mode" description="When ON, every unmatched real request is automatically captured as a new endpoint draft. Pair with Proxy fallback for record-replay testing.">
        <Toggle testId="settings-record" label="Record unmatched requests as new endpoints" value={record} onChange={setRecord} />
      </Section>
      */}

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          data-testid="settings-save"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          <Save className="h-3.5 w-3.5" /> Save settings
        </Button>
      </div>
    </div>
  );
};

const Section = ({ icon: Icon, title, description, children }: any) => (
  <section className="rounded-md border border-border bg-surface/40 p-4">
    <header className="mb-2 flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] text-text-muted">{description}</p>
      </div>
    </header>
    <div className="space-y-2">{children}</div>
  </section>
);

const NumInput = ({ testId, placeholder, value, onChange }: { testId: string; placeholder: string; value?: number; onChange: (v: number) => void }) => (
  <input
    data-testid={testId}
    className="h-7 rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs"
    placeholder={placeholder}
    type="number"
    value={value ?? ''}
    onChange={(e) => onChange(Number(e.target.value))}
  />
);

const Toggle = ({ testId, label, value, onChange }: { testId: string; label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-center gap-2 text-xs">
    <input data-testid={testId} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5" />
    <span className={cn(value ? 'text-text-primary' : 'text-text-secondary')}>{label}</span>
    {value && <Power className="h-3 w-3 text-emerald-400" />}
  </label>
);
