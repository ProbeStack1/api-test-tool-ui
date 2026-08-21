/**
 * ConnectFromCatalogModal — "connect a catalog MCP server" form.
 *
 * Extracted as-is from ServersTab.tsx (same component, same behavior) so
 * it can be shared with McpServerDetailView.tsx too. Previously the detail
 * page's "Connect Server"/"Request Access" button didn't use this modal at
 * all — it had its own shortcut that silently sent a hardcoded fake header
 * ("Bearer YOUR_TOKEN") for any auth-required server, so it looked
 * connected but never actually worked. Now both entry points open this
 * exact same form.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ShieldCheck, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  connectFromCatalog,
  type McpServer,
  type McpCatalogEntry,
} from "@/services/mcp.service";

export const ConnectFromCatalogModal = ({
  entry,
  workspaceId,
  onClose,
  onConnected,
}: {
  entry: McpCatalogEntry;
  workspaceId?: string;
  onClose: () => void;
  onConnected: (s: McpServer) => void;
}) => {
  const [name, setName] = useState(entry.name);
  const [url, setUrl] = useState(entry.serverUrl);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const s = await connectFromCatalog(entry.slug, {
        workspaceId,
        name,
        serverUrl: url,
        transport: entry.transport,
        authHeaders: headers.filter((h) => h.key.trim()),
      });
      toast.success(`Connected: ${s.name}`);
      onConnected(s);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Connect failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Sparkles}
      title={`Connect to ${entry.name}`}
      size="md"
      testId="catalog-connect-modal"
      footer={
        <>
          <Button
            variant="outline"
            data-testid="catalog-connect-cancel"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="catalog-connect-submit"
            disabled={busy}
            onClick={submit}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Connect server
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {entry.requiresAuth && entry.authHelp && (
          <div className="rounded-md border border-warning/40 bg-warning-muted p-3 text-xs text-warning">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            <strong>Auth required:</strong> {entry.authHelp}
          </div>
        )}
        <Field label="Name">
          <input
            data-testid="catalog-connect-name"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Server URL">
          <input
            data-testid="catalog-connect-url"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        {entry.requiresAuth && (
          <Field label="Auth headers">
            <div className="space-y-1.5" data-testid="catalog-connect-auth">
              {headers.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-1.5">
                  <input
                    value={h.key}
                    onChange={(e) =>
                      setHeaders(
                        headers.map((x, j) =>
                          j === i ? { ...x, key: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Header"
                    className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                  />
                  <input
                    value={h.value}
                    onChange={(e) =>
                      setHeaders(
                        headers.map((x, j) =>
                          j === i ? { ...x, value: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Value"
                    className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                  />
                  <button
                    onClick={() =>
                      setHeaders(headers.filter((_, j) => j !== i))
                    }
                    className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setHeaders([...headers, { key: "Authorization", value: "" }])
                }
                data-testid="catalog-connect-add-header"
                className="text-xs text-primary hover:underline"
              >
                + Add header
              </button>
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </div>
    {children}
  </div>
);
