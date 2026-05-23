/**
 * SettingsTab — per-user MCP Studio preferences.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Loader2, Check, Plug, Eye, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getSettings, patchSettings, type McpSettings } from '@/services/mcp.service';
import { cn } from '@/utils/cn';

void Loader2; void Check; void Settings;
// LLM provider selection has been removed from the UI — Gemini (via the
// Emergent universal key on the Java backend) is now the single fixed
// provider for every AI feature, including this MCP Studio surface.

export const SettingsTab = () => {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery({ queryKey: ['mcp-settings'], queryFn: getSettings });
  const [draft, setDraft] = useState<McpSettings | null>(null);

  useEffect(() => { if (s && !draft) setDraft(s); }, [s, draft]);

  const save = useMutation({
    mutationFn: (patch: Partial<McpSettings>) => patchSettings(patch),
    onSuccess: async (next) => {
      setDraft(next);
      await qc.invalidateQueries({ queryKey: ['mcp-settings'] });
      toast.success('Settings saved');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  if (isLoading || !draft) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6" data-testid="mcp-settings-tab">
      <Section icon={Plug} title="Connection">
        <ToggleRow
          label="Auto-connect on Inspector"
          hint="Open the Inspector tab and we'll connect to the active server automatically."
          value={draft.autoConnect}
          onChange={(v) => { const n = { ...draft, autoConnect: v }; setDraft(n); save.mutate({ autoConnect: v }); }}
          testId="set-auto-connect"
        />
      </Section>

      <Section icon={Eye} title="UI">
        <ToggleRow
          label="Show fallback banner"
          hint="When the upstream MCP server is unreachable and the BFF returns canned data, surface a yellow warning bar so you don't mistake it for the real thing."
          value={draft.showFallbackBanner}
          onChange={(v) => { const n = { ...draft, showFallbackBanner: v }; setDraft(n); save.mutate({ showFallbackBanner: v }); }}
          testId="set-fallback-banner"
        />
      </Section>

      <Section icon={ShieldCheck} title="Privacy">
        <ToggleRow
          label="Telemetry consent"
          hint="Send anonymous tool-call counts to help us prioritise the catalog. We never log arguments or response bodies."
          value={draft.telemetryConsent}
          onChange={(v) => { const n = { ...draft, telemetryConsent: v }; setDraft(n); save.mutate({ telemetryConsent: v }); }}
          testId="set-telemetry"
        />
      </Section>
    </div>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <section className="rounded-md border border-border bg-surface/30 p-4">
    <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
      <Icon className="h-3.5 w-3.5 text-primary" /> {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
    <div>
      <div className="text-xs font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-xs leading-snug text-text-muted">{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

const ToggleRow = ({ label, hint, value, onChange, testId }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testId: string }) => (
  <Row label={label} hint={hint}>
    <button
      data-testid={testId}
      onClick={() => onChange(!value)}
      className={cn(
        'relative h-5 w-10 rounded-full border transition-colors',
        value ? 'border-primary bg-primary' : 'border-border bg-elevated',
      )}
    >
      <span className={cn(
        'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5',
      )} />
    </button>
  </Row>
);
