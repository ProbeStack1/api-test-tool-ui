/**
 * VariablesWorkspacePage — main area at /projects/variables.
 *
 * Behaviour (iteration 19, per user feedback):
 *
 *   • A single Postman-style tab bar sits at the top for EVERY scope.
 *       GLOBAL      → tab shows "Globals"
 *       WORKSPACE   → tab shows "Project"
 *       COLLECTION  → tab shows "Collection"
 *       ENVIRONMENT → tab shows "All environments" + every open env tab
 *       LOCAL       → tab shows "Local"
 *   • Singleton scopes (GLOBAL / WORKSPACE / COLLECTION) auto-create the
 *     backing env on first visit — NO "Initialise" empty card any more.
 *     The user lands directly in the key/value table.
 *   • COLLECTION scope: the collection-picker dropdown lives where the
 *     Import / Create buttons live for ENVIRONMENT scope (right side of
 *     the action bar inside the body).
 *   • The key/value editor has NO per-row Active toggle column — it
 *     mimics the Postman Headers/Params table exactly. Typing into the
 *     trailing empty row auto-creates a new empty trailer (no explicit
 *     "Add variable" button).
 *   • Duplicate keys are still rejected client-side AND server-side.
 *   • ENVIRONMENT scope still shows the multi-env list view; only one
 *     env can be active at a time (server-enforced).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import {
  Globe2,
  Briefcase,
  FolderOpen,
  Package,
  Sparkles,
  Plus,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Pencil,
  Zap,
  ZapOff,
  Copy,
  User as UserIcon,
  FileUp,
  Download,
  MoreHorizontal,
  Filter,
  KeyRound,
  CheckSquare,
  FileEdit,
  AlertTriangle,
  Camera,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useSettings } from "@/stores/settings.store";
import { useVariablesUi, type VarScope } from "@/stores/variables-ui.store";
import {
  listEnvironments,
  listEnvironmentsFull,
  getEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  deactivateEnvironment,
  exportPostmanEnvironment,
  importPostmanEnvironment,
  getSnapshot,
  listSnapshots,
  restoreSnapshot,
  type Environment,
  type EnvVariable,
  type EnvSnapshotDetail,
} from "@/services/environment.service";
import {
  listCollections,
  type Collection,
} from "@/services/collection.service";
import { KvTableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePrompt } from "@/components/ui/PromptDialog";

const SCOPE_META: Record<
  VarScope,
  { label: string; icon: any; color: string }
> = {
  GLOBAL: { label: "Globals", icon: Globe2, color: "text-amber-400" },
  WORKSPACE: { label: "Project", icon: Briefcase, color: "text-blue-400" },
  COLLECTION: { label: "Collection", icon: Package, color: "text-sky-400" },
  ENVIRONMENT: {
    label: "Environments",
    icon: FolderOpen,
    color: "text-emerald-400",
  },
  LOCAL: { label: "Local", icon: Sparkles, color: "text-rose-400" },
};

const SnapshotListView = ({
  envId,
  envName,
}: {
  envId: string;
  envName: string;
}) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const closeSnapshotsTab = useVariablesUi((s) => s.closeSnapshotsTab);

  // Fetch list of snapshots
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["snapshots", envId],
    queryFn: () => listSnapshots(envId),
    enabled: !!envId,
  });

  // Fetch current environment once to compute diffs
  const { data: currentEnv } = useQuery({
    queryKey: ["environment-detail", envId, false],
    queryFn: () => getEnvironment(envId, false),
    enabled: !!envId,
  });

  // Fetch snapshot details in parallel to compute diff counts for the table
  const snapshotDetailQueries = useQueries({
    queries: snapshots.map((s) => ({
      queryKey: ["snapshot-detail", envId, s.id],
      queryFn: () => getSnapshot(envId, s.id),
      enabled: !!currentEnv && !!s.id,
      staleTime: 60_000,
    })),
  });

  // Compute diff counts for each snapshot
  const snapshotChanges = useMemo(() => {
    if (!currentEnv) return {};
    const result: Record<
      string,
      { added: number; removed: number; modified: number; total: number }
    > = {};
    const currentVars = currentEnv.variables ?? [];
    const currentMap = new Map(currentVars.map((v) => [v.key, v]));

    for (const [idx, s] of snapshots.entries()) {
      const detail = snapshotDetailQueries[idx]?.data as
        | EnvSnapshotDetail
        | undefined;
      if (!detail) continue;
      const snapshotVars = detail.variables ?? [];
      const snapshotMap = new Map(snapshotVars.map((v) => [v.key, v]));

      let added = 0,
        removed = 0,
        modified = 0;
      for (const [key, cv] of currentMap) {
        if (!snapshotMap.has(key)) added++;
      }
      for (const [key, sv] of snapshotMap) {
        if (!currentMap.has(key)) removed++;
        else {
          const cv = currentMap.get(key)!;
          if (cv.value !== sv.value) modified++;
        }
      }
      result[s.id] = {
        added,
        removed,
        modified,
        total: added + removed + modified,
      };
    }
    return result;
  }, [snapshots, snapshotDetailQueries, currentEnv]);

  // State for selected snapshot (to show diff view)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  );
  // Per‑row restore loading state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Restore mutation – uses restoringId for loading state
  const restoreMut = useMutation({
    mutationFn: async (params: {
      snapshotId: string;
      version?: number;
      label?: string;
    }) => {
      const { snapshotId, version, label } = params;
      // Show confirmation dialog with editable label
      const title = `Restore snapshot v${version || "?"}?`;
      const description = (
        <div className="space-y-2">
          <p>
            This will revert the environment variables to the state at this
            snapshot. A backup snapshot will be created before restoring.
          </p>
          {label && (
            <div>
              <label className="text-xs font-medium text-text-secondary">
                Label (editable):
              </label>
              <input
                defaultValue={label}
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                placeholder="Add a label for this restore (optional)"
                id="restore-label"
              />
            </div>
          )}
        </div>
      );
      const ok = await confirm({
        title,
        description,
        confirmText: "Restore",
        tone: "info",
        testId: "restore-snapshot-confirm",
      });
      if (!ok) throw new Error("Restore cancelled");
      // Read the edited label from the input if present
      const labelInput = document.getElementById(
        "restore-label",
      ) as HTMLInputElement;
      const newLabel = labelInput?.value?.trim() || label;
      // Note: the restore endpoint doesn't accept a label – this is just for the confirmation UX.
      await restoreSnapshot(envId, snapshotId);
      return snapshotId;
    },
    onMutate: (params) => {
      setRestoringId(params.snapshotId);
    },
    onSuccess: () => {
      toast.success("Snapshot restored");
      qc.invalidateQueries({ queryKey: ["snapshots", envId] });
      qc.invalidateQueries({ queryKey: ["environments"] });
      qc.invalidateQueries({ queryKey: ["environment-detail", envId] });
      qc.invalidateQueries({ queryKey: ["snapshot-detail", envId] });
    },
    onError: (e: any) => {
      if (e?.message !== "Restore cancelled") {
        toast.error(e?.message || "Restore failed");
      }
    },
    onSettled: () => {
      setRestoringId(null);
    },
  });

  // Diff view component
  const SnapshotDiffView = ({
    snapshotId,
    onBack,
  }: {
    snapshotId: string;
    onBack: () => void;
  }) => {
    const { data: snapshot, isLoading: snapshotLoading } = useQuery({
      queryKey: ["snapshot-detail", envId, snapshotId],
      queryFn: () => getSnapshot(envId, snapshotId),
      enabled: !!snapshotId,
    });
    const { data: currentEnv, isLoading: envLoading } = useQuery({
      queryKey: ["environment-detail", envId, false],
      queryFn: () => getEnvironment(envId, false),
      enabled: !!snapshotId,
    });

    if (snapshotLoading || envLoading)
      return <div className="p-6 text-xs text-text-muted">Loading diff...</div>;
    if (!snapshot || !currentEnv)
      return (
        <div className="p-6 text-xs text-red-500">Could not load data</div>
      );

    const snapshotVars = snapshot.variables ?? [];
    const currentVars = currentEnv.variables ?? [];
    const snapshotMap = new Map(snapshotVars.map((v) => [v.key, v]));
    const currentMap = new Map(currentVars.map((v) => [v.key, v]));

    const added: EnvVariable[] = [];
    const removed: EnvVariable[] = [];
    const modified: { key: string; old: string; new: string }[] = [];

    for (const [key, cv] of currentMap) {
      if (!snapshotMap.has(key)) added.push(cv);
    }
    for (const [key, sv] of snapshotMap) {
      if (!currentMap.has(key)) removed.push(sv);
      else {
        const cv = currentMap.get(key)!;
        if (cv.value !== sv.value)
          modified.push({ key, old: sv.value, new: cv.value });
      }
    }

    const totalChanges = added.length + removed.length + modified.length;
    const createdBy =
      snapshot.createdBy?.email || snapshot.createdBy?.name || "Unknown";

    return (
      <div className="space-y-4">
        {/* Header with back button, title, and createdBy on the right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to snapshots
            </button>
            <h2 className="text-base font-semibold">
              Snapshot v{snapshot.version}
            </h2>
            <span className="text-xs text-text-muted">
              {formatDate(snapshot.createdAt)}
            </span>
            {snapshot.label && (
              <span className="text-xs text-text-muted">
                · {snapshot.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                restoreMut.mutate({
                  snapshotId,
                  version: snapshot.version,
                  label: snapshot.label,
                })
              }
              disabled={restoringId === snapshotId}
              className="rounded bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
            >
              {restoringId === snapshotId
                ? "Restoring…"
                : "Restore this snapshot"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-4">
            {added.length > 0 && (
              <span className="text-emerald-500">+ {added.length} added</span>
            )}
            {removed.length > 0 && (
              <span className="text-red-500">- {removed.length} removed</span>
            )}
            {modified.length > 0 && (
              <span className="text-yellow-500">
                ~ {modified.length} modified
              </span>
            )}
            {totalChanges === 0 && (
              <span className="text-text-muted">No changes</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-text-muted">
            <UserIcon className="h-3.5 w-3.5" /> {createdBy}
          </span>
        </div>

        {totalChanges > 0 && (
          <div className="rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface text-xs font-semibold uppercase tracking-wide text-text-muted">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Snapshot value</th>
                  <th className="px-4 py-2 text-left">Current value</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {removed.map((v) => (
                  <tr key={v.key} className="border-b border-border/60">
                    <td className="px-4 py-2 font-medium">{v.key}</td>
                    <td className="px-4 py-2 text-text-muted">{v.value}</td>
                    <td className="px-4 py-2 text-red-500">—</td>
                    <td className="px-4 py-2 text-red-500">Removed</td>
                  </tr>
                ))}
                {added.map((v) => (
                  <tr key={v.key} className="border-b border-border/60">
                    <td className="px-4 py-2 font-medium">{v.key}</td>
                    <td className="px-4 py-2 text-text-muted">—</td>
                    <td className="px-4 py-2 text-emerald-500">{v.value}</td>
                    <td className="px-4 py-2 text-emerald-500">Added</td>
                  </tr>
                ))}
                {modified.map((m) => (
                  <tr key={m.key} className="border-b border-border/60">
                    <td className="px-4 py-2 font-medium">{m.key}</td>
                    <td className="px-4 py-2 text-text-muted">{m.old}</td>
                    <td className="px-4 py-2 text-yellow-500">{m.new}</td>
                    <td className="px-4 py-2 text-yellow-500">Modified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Main return
  return (
    <div className=" p-6">
      {!selectedSnapshotId && (
        <header className="mb-4 flex items-center gap-2">
          <button
            onClick={closeSnapshotsTab}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Environments
          </button>
          <h1 className="text-base font-semibold">Snapshots: {envName}</h1>
          <span className="text-xs text-text-muted">({snapshots.length})</span>
        </header>
      )}

      {selectedSnapshotId ? (
        <SnapshotDiffView
          snapshotId={selectedSnapshotId}
          onBack={() => setSelectedSnapshotId(null)}
        />
      ) : (
        <>
          {isLoading && <KvTableSkeleton rows={4} />}
          {!isLoading && snapshots.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-surface/40 p-10 text-center">
              <div className="text-sm font-medium">No snapshots yet.</div>
              <div className="mt-1 text-xs text-text-secondary">
                Snapshots are automatically created when you save an environment
                with snapshot enabled.
              </div>
            </div>
          )}
          {!isLoading && snapshots.length > 0 && (
            <div className="rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left">Version</th>
                    <th className="px-4 py-2 text-left">Created</th>
                    <th className="px-4 py-2 text-left">Label</th>
                    <th className="px-4 py-2 text-left">Changes</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s: any) => {
                    const changes = snapshotChanges[s.id];
                    const changeStr = changes?.total
                      ? `${changes.added > 0 ? "+" + changes.added : ""} ${changes.removed > 0 ? "-" + changes.removed : ""} ${changes.modified > 0 ? "~" + changes.modified : ""}`.trim()
                      : "—";
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-b-0 hover:bg-hover cursor-pointer"
                        onClick={() => setSelectedSnapshotId(s.id)}
                      >
                        <td className="px-4 py-2 font-mono">v{s.version}</td>
                        <td className="px-4 py-2 text-text-muted">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="px-4 py-2">{s.label || "—"}</td>
                        <td className="px-4 py-2 text-text-muted">
                          {changeStr !== "—" ? (
                            <span className="flex gap-1">
                              {changes?.added > 0 && (
                                <span className="text-emerald-500">
                                  +{changes.added}
                                </span>
                              )}
                              {changes?.removed > 0 && (
                                <span className="text-red-500">
                                  -{changes.removed}
                                </span>
                              )}
                              {changes?.modified > 0 && (
                                <span className="text-yellow-500">
                                  ~{changes.modified}
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreMut.mutate({
                                snapshotId: s.id,
                                version: s.version,
                                label: s.label,
                              });
                            }}
                            disabled={restoringId === s.id}
                            className="rounded border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                          >
                            {restoringId === s.id ? "Restoring…" : "Restore"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const VariablesWorkspacePage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const scope = useVariablesUi((s) => s.scope);
  const openTabs = useVariablesUi((s) => s.openTabs);
  const activeTabId = useVariablesUi((s) => s.activeTabId);
  const focusTab = useVariablesUi((s) => s.focusTab);
  const closeTab = useVariablesUi((s) => s.closeTab);
  const openTab = useVariablesUi((s) => s.openTab);
  const snapshotTabEnvId = useVariablesUi((s) => s.snapshotTabEnvId);
  const snapshotTabEnvName = useVariablesUi((s) => s.snapshotTabEnvName);
  const openSnapshotsTab = useVariablesUi((s) => s.openSnapshotsTab);
  const closeSnapshotsTab = useVariablesUi((s) => s.closeSnapshotsTab);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  );

  const { data: envs = [], isLoading } = useQuery({
    /* Use the FULL list so each summary carries `variables` + `tags`
     * (collection scope needs `tags.collectionId` to match, otherwise the
     * page thinks no env exists and tries to recreate it → 409). */
    queryKey: ["environments", ws?.id, false, "full"],
    queryFn: () => listEnvironmentsFull(ws?.id, false),
    enabled: !!ws?.id,
    /* Always re-fetch when the user lands on the page so they don't see a
     * stale empty state from a previous workspace. */
    staleTime: 0,
    refetchOnMount: "always",
  });

  const renameTab = useVariablesUi((s) => s.renameTab);
  useEffect(() => {
    for (const t of openTabs) {
      const e = envs.find((x) => x.id === t.id);
      if (e && e.name !== t.name) renameTab(t.id, e.name);
    }
  }, [envs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ws) {
    return (
      <div
        data-testid="vars-no-workspace"
        className="flex h-full items-center justify-center p-10 text-center"
      >
        <div className="space-y-2">
          <FolderOpen className="mx-auto h-8 w-8 text-primary" />
          <div className="text-sm font-semibold">Pick a project first.</div>
          <div className="text-xs text-text-secondary">
            Open the Project tab on the right rail to choose a project.
          </div>
        </div>
      </div>
    );
  }

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? null;
  const activeEnv = activeTab ? envs.find((e) => e.id === activeTab.id) : null;

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-probestack-bg"
      data-testid="variables-page"
    >
      <ScopeTabBar
        scope={scope}
        openTabs={scope === "ENVIRONMENT" ? openTabs : []}
        activeTabId={activeTabId}
        onScopeTab={() => focusTab(null)}
        onTab={(id) => focusTab(id)}
        onClose={(id) => {
          if (id === "snapshots") {
            closeSnapshotsTab();
          } else {
            closeTab(id);
          }
        }}
        snapshotTab={
          snapshotTabEnvId
            ? {
                id: "snapshots",
                name: `Snapshots: ${snapshotTabEnvName || ""}`,
                envId: snapshotTabEnvId,
              }
            : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeTabId === "snapshots" && snapshotTabEnvId ? (
          <SnapshotListView
            envId={snapshotTabEnvId}
            envName={snapshotTabEnvName || "Snapshots"}
          />
        ) : (
          <>
            {scope === "GLOBAL" && (
              <SingletonScope kind="GLOBAL" envs={envs} workspaceId={ws.id} />
            )}
            {scope === "WORKSPACE" && (
              <SingletonScope
                kind="WORKSPACE"
                envs={envs}
                workspaceId={ws.id}
              />
            )}
            {scope === "COLLECTION" && (
              <CollectionScope workspaceId={ws.id} envs={envs} />
            )}
            {scope === "ENVIRONMENT" &&
              (activeTab && activeEnv ? (
                <EnvDetailView env={activeEnv} />
              ) : (
                <EnvironmentListView
                  workspaceId={ws.id}
                  envs={envs.filter((e) => e.scope === "ENVIRONMENT")}
                  isLoading={isLoading}
                  onOpen={(e) =>
                    openTab({ id: e.id, name: e.name, scope: "ENVIRONMENT" })
                  }
                />
              ))}
            {scope === "LOCAL" && <LocalScopeView />}
          </>
        )}
      </div>
      <HowToUseFooter scope={activeEnv ? "ENVIRONMENT" : scope} />
    </div>
  );
};

/* ─── Scope tab bar (always visible, mimics Postman) ────────────────── */
const ScopeTabBar = ({
  scope,
  openTabs,
  activeTabId,
  onScopeTab,
  onTab,
  onClose,
  snapshotTab,
}: {
  scope: VarScope;
  openTabs: { id: string; name: string; scope: VarScope }[];
  activeTabId: string | null;
  onScopeTab: () => void;
  onTab: (id: string) => void;
  onClose: (id: string) => void;
  snapshotTab?: { id: string; name: string; envId: string };
}) => {
  const M = SCOPE_META[scope];
  const Icon = M.icon;
  const scopeTabLabel =
    scope === "ENVIRONMENT"
      ? "All environments"
      : scope === "GLOBAL"
        ? "Globals"
        : scope === "WORKSPACE"
          ? "Project"
          : scope === "COLLECTION"
            ? "Collection"
            : "Local";

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2"
      data-testid="vars-tabbar"
    >
      <button
        data-testid="vars-tab-scope"
        onClick={onScopeTab}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs transition-colors",
          activeTabId === null
            ? "border-primary text-primary"
            : "border-transparent text-text-secondary hover:text-text-primary",
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", M.color)} />
        <span className="font-medium">{scopeTabLabel}</span>
      </button>
      {openTabs.map((t) => {
        const TI = SCOPE_META[t.scope].icon;
        const active = activeTabId === t.id;
        return (
          <div
            key={t.id}
            className={cn(
              "group flex h-9 shrink-0 items-center gap-1 border-b-2 pl-2 pr-1 text-xs transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            <button
              data-testid={`vars-tab-${t.id}`}
              onClick={() => onTab(t.id)}
              className="flex items-center gap-1.5"
            >
              <TI className={cn("h-3.5 w-3.5", SCOPE_META[t.scope].color)} />
              <span className="max-w-[200px] truncate font-medium">
                {t.name}
              </span>
            </button>
            <button
              data-testid={`vars-tab-close-${t.id}`}
              onClick={() => onClose(t.id)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-text-primary group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {snapshotTab && (
        <div
          key={snapshotTab.id}
          className={cn(
            "group flex h-9 shrink-0 items-center gap-1 border-b-2 pl-2 pr-1 text-xs transition-colors",
            activeTabId === snapshotTab.id
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          <button
            data-testid={`vars-tab-${snapshotTab.id}`}
            onClick={() => onTab(snapshotTab.id)}
            className="flex items-center gap-1.5"
          >
            <Camera className="h-3.5 w-3.5 text-emerald-400" />
            <span className="max-w-[200px] truncate font-medium">
              {snapshotTab.name}
            </span>
          </button>
          <button
            data-testid={`vars-tab-close-${snapshotTab.id}`}
            onClick={() => onClose(snapshotTab.id)}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-text-primary group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Singleton-scope view (GLOBAL / WORKSPACE) ──────────────────────── */
const SingletonScope = ({
  kind,
  envs,
  workspaceId,
}: {
  kind: "GLOBAL" | "WORKSPACE";
  envs: Environment[];
  workspaceId: string;
}) => {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.current);
  const M = SCOPE_META[kind];
  const Icon = M.icon;

  const expectedName =
    kind === "GLOBAL" ? "Globals" : `${ws?.name ?? "Project"} variables`;
  const expectedNameLc = expectedName.trim().toLowerCase();
  const existing = useMemo(() => {
    /* Primary match — singleton-scope identity (org / workspace). */
    let hit = envs.find(
      (e) =>
        e.scope === kind &&
        (kind === "GLOBAL" ? true : e.workspaceId === workspaceId),
    );
    /* Fallback — match by NAME (covers older envs that pre-date the
     * scope-aware singleton model). */
    if (!hit)
      hit = envs.find(
        (e) =>
          e.scope === kind && e.name.trim().toLowerCase() === expectedNameLc,
      );
    return hit;
  }, [envs, kind, workspaceId, expectedNameLc]);

  const initMut = useMutation({
    mutationFn: () =>
      createEnvironment(kind === "GLOBAL" ? null : workspaceId, {
        name: expectedName,
        scope: kind,
        variables: [],
      }),
    onSuccess: async (created) => {
      /* Optimistic insert + refetch. The optimistic write makes the
       * editor flip out of skeleton immediately; the invalidation keeps
       * the cache in sync with the server (which is now also returning
       * the env after the canRead fix). */
      qc.setQueryData<Environment[]>(
        ["environments", workspaceId, false, "full"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((e) => e.id === created.id)) return list;
          return [...list, created];
        },
      );
      await qc.invalidateQueries({ queryKey: ["environments"] });
    },
  });

  // Auto-create singleton silently on first visit — no Initialise button.
  const triedRef = useRef(false);
  useEffect(() => {
    if (!existing && !initMut.isPending && !triedRef.current) {
      triedRef.current = true;
      initMut.mutate();
    }
  }, [existing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!existing) {
    return (
      <div className=" p-6" data-testid={`vars-init-${kind.toLowerCase()}`}>
        <header className="mb-4 flex items-center gap-2">
          <Icon className={cn("h-5 w-5", M.color)} />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-16" />
        </header>
        <KvTableSkeleton
          rows={5}
          testId={`vars-skeleton-${kind.toLowerCase()}`}
        />
      </div>
    );
  }

  return <DirectVarTable env={existing} kind={kind} />;
};

/* ─── COLLECTION scope ────────────────────────────────────────────────── */
const CollectionScope = ({
  workspaceId,
  envs,
}: {
  workspaceId: string;
  envs: Environment[];
}) => {
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections", workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: !!workspaceId,
  });
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedColId && collections.length > 0)
      setSelectedColId(collections[0].id);
  }, [collections, selectedColId]);

  const collection: Collection | null =
    collections.find((c) => c.id === selectedColId) ?? null;
  /* Lookup is intentionally lenient — backends sometimes round-trip the
   * collection id under a top-level field instead of `tags.collectionId`,
   * AND historic envs may have been created without the tag at all. We
   * match in this priority order so we never spuriously trigger a create
   * (which would 409 on the unique-name index):
   *   1) tags.collectionId or top-level collectionId equals current id
   *   2) COLLECTION-scope env whose NAME matches the auto-create name
   *      (this is the common "env exists from older code path" case)
   * The 409 handler in createEnvironment also has a name-fallback so even
   * if both layers miss, we recover gracefully without surfacing an error. */
  const expectedName = collection
    ? `${collection.name} variables`
    : "Collection variables";
  const expectedNameLc = expectedName.trim().toLowerCase();
  const existing = useMemo(() => {
    let hit = envs.find((e) => {
      if (e.scope !== "COLLECTION") return false;
      const fromTag = (e.tags as any)?.collectionId;
      const fromField = (e as any).collectionId;
      return fromTag === selectedColId || fromField === selectedColId;
    });
    if (!hit && selectedColId) {
      hit = envs.find(
        (e) =>
          e.scope === "COLLECTION" &&
          e.name.trim().toLowerCase() === expectedNameLc,
      );
    }
    return hit;
  }, [envs, selectedColId, expectedNameLc]);
  const qc = useQueryClient();
  const initMut = useMutation({
    mutationFn: () =>
      createEnvironment(workspaceId, {
        name: expectedName,
        scope: "COLLECTION",
        variables: [],
        tags: { collectionId: selectedColId ?? "" } as any,
      } as any),
    onSuccess: async (created) => {
      qc.setQueryData<Environment[]>(
        ["environments", workspaceId, false, "full"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((e) => e.id === created.id)) return list;
          return [...list, created];
        },
      );
      await qc.invalidateQueries({ queryKey: ["environments"] });
    },
  });

  // Auto-create when a collection is selected and no env exists yet.
  const triedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      selectedColId &&
      !existing &&
      !initMut.isPending &&
      triedRef.current !== selectedColId
    ) {
      triedRef.current = selectedColId;
      initMut.mutate();
    }
  }, [selectedColId, existing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading)
    return (
      <div className=" p-6" data-testid="vars-skeleton-collection-loading">
        <header className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-sky-400" />
          <Skeleton className="h-4 w-40" />
        </header>
        <KvTableSkeleton rows={4} />
      </div>
    );
  if (collections.length === 0) {
    return (
      <div
        className="mx-auto max-w-3xl p-6"
        data-testid="vars-empty-collection-no-coll"
      >
        <div className="rounded-md border border-dashed border-border bg-surface/40 p-10 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-sky-400 opacity-60" />
          <div className="text-sm font-medium">
            No collections in this project yet.
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Create a collection from the Collection rail, then come back here to
            add its variables.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="vars-list-collection">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-sky-400" />
          <h1 className="text-sm font-semibold">Collection variables</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-text-muted">Collection:</label>
          <select
            data-testid="vars-collection-picker"
            value={selectedColId ?? ""}
            onChange={(e) => setSelectedColId(e.target.value || null)}
            className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary"
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {!existing ? (
          <div
            className="flex h-full items-center justify-center p-10"
            data-testid="vars-init-collection"
          >
            {initMut.isError ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div
                  className="text-xs text-red-500"
                  data-testid="vars-init-collection-error"
                >
                  Could not auto-create the variable bag for "{collection?.name}
                  ".
                </div>
                <div className="text-[11px] text-text-muted">
                  {(initMut.error as any)?.message ??
                    "Unknown error from environment service."}
                </div>
                <Button
                  variant="outline"
                  data-testid="vars-init-collection-retry"
                  onClick={() => {
                    triedRef.current = null;
                    initMut.reset();
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Preparing variables for "{collection?.name}"…
              </div>
            )}
          </div>
        ) : (
          <DirectVarTable
            env={existing}
            kind="COLLECTION"
            headerLabel={collection?.name}
          />
        )}
      </div>
    </div>
  );
};

/* ─── Environment list view ──────────────────────────────────────────── */
const EnvironmentListView = ({
  workspaceId,
  envs,
  isLoading,
  onOpen,
}: {
  workspaceId: string;
  envs: Environment[];
  isLoading: boolean;
  onOpen: (e: Environment) => void;
}) => {
  const qc = useQueryClient();
  const settings = useSettings();
  const importInputRef = useRef<HTMLInputElement>(null);
  const columns = useVariablesUi((s) => s.columns);
  const toggleColumn = useVariablesUi((s) => s.toggleColumn);
  const openSnapshotsTab = useVariablesUi((s) => s.openSnapshotsTab);
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [creatingEnv, setCreatingEnv] = useState(false);

  const onCreate = () => {
    setNewEnvName("");
    setShowCreateModal(true);
  };

  const submitCreate = async () => {
    const name = newEnvName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    try {
      setCreatingEnv(true);
      const e = await createEnvironment(workspaceId, {
        name,
        scope: "ENVIRONMENT",
        variables: [],
      });
      qc.setQueryData<Environment[]>(
        ["environments", workspaceId, false, "full"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((x) => x.id === e.id)) return list;
          return [...list, e];
        },
      );
      await qc.invalidateQueries({ queryKey: ["environments"] });
      toast.success(`Environment "${name}" created`);
      setShowCreateModal(false);
      setNewEnvName("");
      onOpen(e);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  const onActivate = async (env: Environment) => {
    if (settings.activeEnvId === env.id) {
      await deactivateEnvironment(env.id);
      settings.setActiveEnvId(null);
    } else {
      await activateEnvironment(env.id);
      settings.setActiveEnvId(env.id);
    }
    await qc.invalidateQueries({ queryKey: ["environments"] });
    toast.success(
      settings.activeEnvId === env.id ? "Deactivated" : `${env.name} activated`,
    );
  };

  return (
    <div className=" space-y-4 p-6" data-testid="vars-list-environment">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-emerald-400" />
          <h1 className="text-base font-semibold">Environments</h1>
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-mono text-text-muted">
            {envs.length}
          </span>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
            One activates at a time
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            data-testid="vars-import-btn"
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" /> Import Postman
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="vars-import-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await importPostmanEnvironment(workspaceId, f);
                await qc.invalidateQueries({ queryKey: ["environments"] });
                toast.success("Imported");
              } catch (err: any) {
                toast.error(err?.message ?? "Import failed");
              }
              e.currentTarget.value = "";
            }}
          />
          <Button
            variant="primary"
            data-testid="vars-create-btn"
            onClick={onCreate}
          >
            <Plus className="h-3.5 w-3.5" /> New environment
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2" data-testid="vars-skeleton-env-list">
          <Skeleton className="h-4 w-32" />
          <KvTableSkeleton rows={4} cols={[2, 1, 1, 2, 2]} />
        </div>
      )}

      {!isLoading && envs.length === 0 && (
        <div
          data-testid="vars-empty-environment"
          className="rounded-md border border-dashed border-border bg-surface/40 p-10 text-center"
        >
          <FolderOpen className="mx-auto mb-2 h-8 w-8 text-emerald-400 opacity-60" />
          <div className="text-sm font-medium">No environments yet.</div>
          <div className="mt-1 text-xs text-text-secondary">
            Create one to start storing variables.
          </div>
        </div>
      )}

      {!isLoading && envs.length > 0 && (
        <div
          className="overflow-visible rounded-md border border-border"
          data-testid="vars-table-environment"
        >
          <table className="w-full text-xs">
            <thead className="bg-surface text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Variables</th>
                <th className="px-2 py-2 text-left">Secrets</th>
                <th className="px-2 py-2 text-left">Created by</th>
                {columns.createdAt && (
                  <th className="px-2 py-2 text-left">Created</th>
                )}
                {columns.updatedAt && (
                  <th className="px-2 py-2 text-left">Updated</th>
                )}
                <th className="px-2 py-2 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setColMenuOpen((m) => !m)}
                      data-testid="vars-col-toggle"
                      className="flex h-6 items-center gap-1 rounded border border-border px-1.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary"
                    >
                      <Filter className="h-3 w-3" /> Columns
                    </button>
                    {colMenuOpen && (
                      <div
                        className="absolute right-0 top-7 z-30 w-48 rounded-md border border-border bg-surface p-2 text-left text-[11px] shadow-lg"
                        onMouseLeave={() => setColMenuOpen(false)}
                      >
                        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                          Optional columns
                        </div>
                        <ColCheck
                          label="Created at"
                          checked={columns.createdAt}
                          onChange={() => toggleColumn("createdAt")}
                          testId="vars-col-createdAt"
                        />
                        <ColCheck
                          label="Updated at"
                          checked={columns.updatedAt}
                          onChange={() => toggleColumn("updatedAt")}
                          testId="vars-col-updatedAt"
                        />
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {envs.map((e) => {
                const isActive = settings.activeEnvId === e.id;
                return (
                  <tr
                    key={e.id}
                    data-testid={`vars-row-${e.id}`}
                    className="border-b border-border/60 last:border-b-0 hover:bg-hover"
                  >
                    <td
                      className="cursor-pointer px-4 py-2.5"
                      onClick={() => onOpen(e)}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: e.color || "#34d399" }}
                        />
                        <span className="truncate font-medium">{e.name}</span>
                        {isActive && (
                          <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-500">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-text-secondary">
                      {(e.variables ?? []).length}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-text-secondary">
                      {
                        (e.variables ?? []).filter((v) => v.type === "SECRET")
                          .length
                      }
                    </td>
                    <td className="px-2 py-2.5 text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3 text-text-muted" />
                        {e.createdBy?.email || e.createdBy?.name || "—"}
                      </span>
                    </td>
                    {columns.createdAt && (
                      <td className="px-2 py-2.5 text-text-muted">
                        {formatDate(e.createdAt)}
                      </td>
                    )}
                    {columns.updatedAt && (
                      <td className="px-2 py-2.5 text-text-muted">
                        {formatDate(e.updatedAt)}
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          data-testid={`vars-row-activate-toggle-${e.id}`}
                          onClick={() => onActivate(e)}
                          className={cn(
                            "flex h-6 items-center gap-1 rounded border px-2 text-xs transition-colors",
                            isActive
                              ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-500"
                              : "border-border text-text-secondary hover:border-emerald-400 hover:text-emerald-400",
                          )}
                          title={
                            isActive
                              ? "Currently active — click to deactivate"
                              : "Activate this environment"
                          }
                        >
                          {isActive ? (
                            <ZapOff className="h-3 w-3" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                          {isActive ? "Active" : "Activate"}
                        </button>
                        <button
                          data-testid={`vars-row-open-${e.id}`}
                          onClick={() => onOpen(e)}
                          className="rounded border border-border px-2 py-0.5 text-xs text-text-secondary hover:border-primary/40 hover:text-primary"
                        >
                          Open
                        </button>
                        <div className="relative">
                          <button
                            data-testid={`vars-row-actions-${e.id}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setRowMenu((m) => (m === e.id ? null : e.id));
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-text-muted hover:border-border hover:bg-hover hover:text-text-primary"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {rowMenu === e.id && (
                            <div
                              className="absolute right-0 top-7 z-30 w-44 rounded-md border border-border bg-surface p-1 text-left text-[11px] shadow-lg"
                              onMouseLeave={() => setRowMenu(null)}
                            >
                              <RowMenuItem
                                icon={Copy}
                                testId={`vars-row-clone-${e.id}`}
                                onClick={async () => {
                                  setRowMenu(null);
                                  const c = await createEnvironment(
                                    workspaceId,
                                    {
                                      name: `${e.name} Copy`,
                                      scope: "ENVIRONMENT",
                                      variables: (e.variables ?? []).map(
                                        ({
                                          key,
                                          value,
                                          type,
                                          enabled,
                                          description,
                                        }) => ({
                                          key,
                                          value,
                                          type,
                                          enabled,
                                          description,
                                        }),
                                      ),
                                    } as any,
                                  );
                                  qc.setQueryData<Environment[]>(
                                    [
                                      "environments",
                                      workspaceId,
                                      false,
                                      "full",
                                    ],
                                    (prev) => {
                                      const list = Array.isArray(prev)
                                        ? prev
                                        : [];
                                      if (list.some((x) => x.id === c.id))
                                        return list;
                                      return [...list, c];
                                    },
                                  );
                                  await qc.invalidateQueries({
                                    queryKey: ["environments"],
                                  });
                                  onOpen(c);
                                  toast.success("Cloned");
                                }}
                              >
                                Clone
                              </RowMenuItem>
                              <RowMenuItem
                                icon={FileEdit}
                                testId={`vars-row-rename-${e.id}`}
                                onClick={async () => {
                                  setRowMenu(null);
                                  const n = await prompt({
                                    title: "Rename environment",
                                    label: "New name",
                                    initialValue: e.name,
                                    placeholder: "Environment name",
                                    confirmText: "Rename",
                                    testId: "vars-rename-env-prompt",
                                  });
                                  if (!n || n === e.name) return;
                                  await updateEnvironment(e.id, { name: n });
                                  await qc.invalidateQueries({
                                    queryKey: ["environments"],
                                  });
                                  toast.success("Renamed");
                                }}
                              >
                                Rename
                              </RowMenuItem>
                              <RowMenuItem
                                icon={Download}
                                testId={`vars-row-export-${e.id}`}
                                onClick={async () => {
                                  setRowMenu(null);
                                  const r = await exportPostmanEnvironment(
                                    e.id,
                                    false,
                                  );
                                  const url = URL.createObjectURL(r.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${e.name}.postman_environment.json`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                Export
                              </RowMenuItem>
                              <RowMenuItem
                                icon={Camera}
                                testId={`vars-row-snapshots-${e.id}`}
                                onClick={() => {
                                  setRowMenu(null);
                                  openSnapshotsTab(e.id, e.name);
                                }}
                              >
                                Snapshots
                              </RowMenuItem>
                              <div className="my-1 border-t border-border" />
                              <RowMenuItem
                                icon={Trash2}
                                testId={`vars-row-delete-${e.id}`}
                                onClick={async () => {
                                  setRowMenu(null);
                                  const ok = await confirm({
                                    title: `Move "${e.name}" to trash?`,
                                    description:
                                      "You can restore from Trash within 90 days.",
                                    confirmText: "Move to trash",
                                    tone: "danger",
                                    testId: "vars-delete-env-confirm",
                                  });
                                  if (!ok) return;
                                  await deleteEnvironment(e.id);
                                  await qc.invalidateQueries({
                                    queryKey: ["environments"],
                                  });
                                  toast.success("Moved to trash");
                                }}
                              >
                                <span className="text-red-500">Delete</span>
                              </RowMenuItem>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => {
          if (!creatingEnv) {
            setShowCreateModal(false);
            setNewEnvName("");
          }
        }}
        title="New environment"
        icon={FolderOpen}
        size="sm"
        testId="vars-create-env-modal"
        footer={
          <>
            <Button
              variant="outline"
              data-testid="vars-create-env-cancel"
              disabled={creatingEnv}
              onClick={() => {
                setShowCreateModal(false);
                setNewEnvName("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              data-testid="vars-create-env-submit"
              disabled={creatingEnv || !newEnvName.trim()}
              onClick={submitCreate}
            >
              {creatingEnv ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label
            className="block text-xs font-medium text-text-secondary"
            htmlFor="vars-create-env-name"
          >
            Environment name
          </label>
          <input
            id="vars-create-env-name"
            autoFocus
            data-testid="vars-create-env-name"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newEnvName.trim() && !creatingEnv) {
                e.preventDefault();
                submitCreate();
              }
            }}
            placeholder="e.g. Staging, Production"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          />
          <p className="text-[11px] text-text-muted">
            Variables can be added after the environment is created.
          </p>
        </div>
      </Modal>
    </div>
  );
};

const ColCheck = ({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  testId: string;
}) => (
  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-hover">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      data-testid={testId}
    />
    <span>{label}</span>
  </label>
);

const RowMenuItem = ({
  icon: Icon,
  testId,
  onClick,
  children,
}: {
  icon: any;
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-hover"
  >
    <Icon className="h-3.5 w-3.5 text-text-muted" />
    {children}
  </button>
);

const formatDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return s;
  }
};

const LocalScopeView = () => (
  <div className="mx-auto max-w-3xl p-6" data-testid="vars-list-local">
    <header className="mb-3 flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-rose-400" />
      <h1 className="text-base font-semibold">Local variables</h1>
    </header>
    <div className="rounded-md border border-rose-400/30 bg-rose-500/5 p-5">
      <p className="text-sm text-text-primary">
        Local variables are <strong>runtime-only</strong>. They are set inside
        pre-request and test scripts using
        <code className="mx-1 rounded bg-elevated px-1 font-mono">
          pm.variables.set("KEY", value)
        </code>
        and live for the duration of a single request. They{" "}
        <strong>beat every other scope</strong> in resolution.
      </p>
      <p className="mt-3 text-xs text-text-secondary">
        Locals are never persisted, so there is nothing to manage from this
        screen.
      </p>
    </div>
  </div>
);

/* ─── Direct key/value table (used by GLOBAL / WORKSPACE / COLLECTION) ─ */
const DirectVarTable = ({
  env,
  kind,
  headerLabel,
}: {
  env: Environment | undefined;
  kind: "GLOBAL" | "WORKSPACE" | "COLLECTION";
  headerLabel?: string;
}) => {
  const M = SCOPE_META[kind];
  const Icon = M.icon;
  const openSnapshotsTab = useVariablesUi((s) => s.openSnapshotsTab);
  const variables = env?.variables ?? [];

  if (!env) {
    return (
      <div className=" p-6" data-testid={`vars-direct-${kind.toLowerCase()}`}>
        <header className="mb-4 flex items-center gap-2">
          <Icon className={cn("h-5 w-5", M.color)} />
          <h1 className="text-base font-semibold">
            {headerLabel ?? M.label} variables
          </h1>
        </header>
        <div className="rounded border border-border bg-elevated p-4 text-sm text-text-secondary">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className=" p-6" data-testid={`vars-direct-${kind.toLowerCase()}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", M.color)} />
          <h1 className="text-base font-semibold">
            {headerLabel ?? M.label} variables
          </h1>
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-mono text-text-muted">
            {variables.length}
          </span>
          {kind === "GLOBAL" && (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
              Singleton — one per organisation
            </span>
          )}
          {kind === "WORKSPACE" && (
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
              Singleton — one per project
            </span>
          )}
          {kind === "COLLECTION" && (
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-500">
              Singleton — one per collection
            </span>
          )}
        </div>
        <Button
          variant="outline"
          data-testid={`vars-snapshots-${kind.toLowerCase()}`}
          onClick={() => openSnapshotsTab(env.id, env.name)}
        >
          <Camera className="h-3.5 w-3.5" /> Snapshots
        </Button>
      </header>
      <VariablesEditor env={env} />
    </div>
  );
};

/* ─── Env detail view (used by ENVIRONMENT scope only) ───────────────── */
const EnvDetailView = ({ env }: { env: Environment }) => {
  const settings = useSettings();
  const renameTab = useVariablesUi((s) => s.renameTab);
  const qc = useQueryClient();
  const openSnapshotsTab = useVariablesUi((s) => s.openSnapshotsTab);
  const isActive = settings.activeEnvId === env.id;
  const [name, setName] = useState(env.name);
  const [editingName, setEditingName] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Local color for immediate UI feedback
  const [localColor, setLocalColor] = useState(env.color || "#34d399");

  // Sync localColor when env changes
  useEffect(() => {
    setLocalColor(env.color || "#34d399");
    // Clear any pending save when switching envs
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [env.id, env.color]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced color update
  const handleColorChange = (newColor: string) => {
    // Immediate UI update
    setLocalColor(newColor);

    // Clear any existing timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Schedule API call after 2 seconds of inactivity
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await updateEnvironment(env.id, { color: newColor });
        await qc.invalidateQueries({ queryKey: ["environments"] });
        // toast.success('Color updated'); // optional, avoid spam
      } catch (err: any) {
        toast.error(err?.message || "Failed to update color");
      }
    }, 2000);
  };

  useEffect(() => {
    setName(env.name);
    setEditingName(false);
  }, [env.id, env.name]);

  return (
    <div className="p-6" data-testid="vars-env-detail">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Folder icon – color matches localColor */}
          <FolderOpen
            className="h-4 w-4 shrink-0"
            style={{ color: localColor }}
          />

          {/* Clickable color swatch */}
          <div
            className="h-5 w-5 shrink-0 cursor-pointer rounded border border-border"
            style={{ backgroundColor: localColor }}
            onClick={() => colorInputRef.current?.click()}
            title="Click to change environment color"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={localColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="hidden"
          />

          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (name !== env.name && name.trim()) {
                  await updateEnvironment(env.id, { name: name.trim() });
                  await qc.invalidateQueries({ queryKey: ["environments"] });
                  renameTab(env.id, name.trim());
                }
              }}
              data-testid="vars-env-name"
              className="h-8 w-80 rounded-md border border-border bg-probestack-bg px-3 text-sm font-semibold outline-none focus:border-primary"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              data-testid="vars-env-name-btn"
              className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold hover:bg-hover"
            >
              {name}
              <Pencil className="h-3 w-3 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <span className="rounded bg-elevated px-2 py-0.5 text-xs font-semibold text-text-muted">
            ENVIRONMENT
          </span>
          {isActive && (
            <span className="flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-500">
              <Zap className="h-3 w-3" /> ACTIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            data-testid="vars-env-snapshots"
            onClick={() => openSnapshotsTab(env.id, env.name)}
          >
            <Camera className="h-3.5 w-3.5" /> Snapshots
          </Button>
          <Button
            variant={isActive ? "outline" : "primary"}
            data-testid="vars-env-activate"
            onClick={async () => {
              if (isActive) {
                await deactivateEnvironment(env.id);
                settings.setActiveEnvId(null);
                toast.success("Deactivated");
              } else {
                await activateEnvironment(env.id);
                settings.setActiveEnvId(env.id);
                toast.success(`${env.name} activated`);
              }
              await qc.invalidateQueries({ queryKey: ["environments"] });
            }}
          >
            {isActive ? (
              <ZapOff className="h-3.5 w-3.5" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </header>
      <VariablesEditor env={env} />
    </div>
  );
};

/* ─── VariablesEditor (the actual key/value table) ────────────────────── */
type Row = EnvVariable & {
  initialValue: string;
  serverKey: string | null;
};

const makeRow = (v: EnvVariable): Row => ({
  ...v,
  initialValue: v.value,
  serverKey: v.key || null,
});

const blankRow = (): Row => ({
  key: "",
  value: "",
  initialValue: "",
  type: "DEFAULT",
  enabled: false,
  description: "",
  serverKey: null,
});

const isRowEmpty = (r: Row) =>
  !r.key.trim() &&
  !r.value.trim() &&
  !r.initialValue.trim() &&
  !(r.description ?? "").trim();

const VariablesEditor = ({ env: envSummary }: { env: Environment }) => {
  const qc = useQueryClient();
  const ws = useWorkspaceStore((s) => s.current);
  const [reveals, setReveals] = useState<Record<number, boolean>>({});
  // Cached *revealed* (unmasked) values keyed by row key. We fetch them
  // lazily the first time the user clicks the eye icon on ANY secret row,
  // then merge them into the visible value when reveal[i] is true. This
  // works because the Java env service only returns plaintext secrets when
  // the request carries `?reveal=true` AND the caller has reveal grant.
  const [revealedMap, setRevealedMap] = useState<Record<string, string> | null>(
    null,
  );
  const [revealLoading, setRevealLoading] = useState(false);

  // The list endpoint returns env *summaries* (no `variables` array).
  // Fetch the authoritative detail for this id — react-query caches it,
  // so swapping tabs is instant and refetch-after-save is automatic.
  const { data: env = envSummary } = useQuery({
    queryKey: ["environment-detail", envSummary.id, false],
    queryFn: () => getEnvironment(envSummary.id, false),
    enabled: !!envSummary.id,
    staleTime: 10_000,
    initialData: envSummary.variables ? envSummary : undefined,
  });

  const initialVars = env.variables ?? [];
  const [rows, setRows] = useState<Row[]>(() => initialVars.map(makeRow));

  // Re-seed the editable rows whenever a fresh detail-payload arrives.
  // Use the env reference itself as the dep — react-query gives us a brand
  // new object on every successful fetch, so this fires on first load,
  // refresh, and any save-cache update. Earlier we depended on
  // `env.updatedAt` which sometimes did not change between summary and
  // detail responses, leaving the table stuck at empty until the user
  // clicked Reset.
  useEffect(() => {
    setRows((env.variables ?? []).map(makeRow));
    setReveals({});
  }, [env]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render rows = saved rows + ALWAYS one trailing empty row (Postman-style).
  // Typing into the trailer turns it into a real row and a fresh empty
  // trailer is appended below. Empty trailer has no delete icon.
  const display = useMemo(() => {
    const stripped = rows.filter(
      (_, i) => !(i === rows.length - 1 && isRowEmpty(rows[rows.length - 1])),
    );
    return [...stripped, blankRow()];
  }, [rows]);

  /** updateRow — touches `enabled` semantics:
   *   • Empty row + user starts typing  → auto enable.
   *   • User explicitly toggles checkbox → respected verbatim.
   */
  const updateRow = (
    idx: number,
    patch: Partial<Row>,
    opts?: { fromCheckbox?: boolean },
  ) => {
    setRows((currentRows) => {
      // Build the display array again (same logic as before)
      const stripped = currentRows.filter(
        (r) => !(isRowEmpty(r) && r !== currentRows[currentRows.length - 1]),
      );
      const displayRows = [...stripped, blankRow()];

      // Guard against invalid index or missing row
      if (idx < 0 || idx >= displayRows.length) return currentRows;
      const row = displayRows[idx];
      if (!row) return currentRows; // extra safety

      const merged = { ...row, ...patch };
      if (!opts?.fromCheckbox) {
        const wasEmpty = isRowEmpty(row);
        const nowFilled = !isRowEmpty(merged);
        if (wasEmpty && nowFilled) merged.enabled = true;
      }

      const newDisplay = [...displayRows];
      newDisplay[idx] = merged;

      // Keep all non‑empty rows, and keep exactly one trailing empty row
      const meaningful = newDisplay.filter(
        (r, i) => !isRowEmpty(r) || i === newDisplay.length - 1,
      );
      return meaningful;
    });
  };

  const removeRow = (idx: number) => {
    setRows(() =>
      display.filter((_, i) => i !== idx).filter((r) => !isRowEmpty(r)),
    );
  };

  const dirty = useMemo(() => {
    const orig = env.variables ?? [];
    const meaningful = rows.filter((r) => !isRowEmpty(r));
    if (meaningful.length !== orig.length) return true;
    return meaningful.some((r, i) => {
      const o = orig[i];
      if (!o) return true;
      return (
        r.key !== o.key ||
        r.value !== o.value ||
        r.type !== o.type ||
        r.enabled !== o.enabled ||
        (r.description || "") !== (o.description || "")
      );
    });
  }, [rows, env]);

  // Duplicate-key detection (per scope rule).
  const duplicateKeys = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = (r.key || "").trim();
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, c]) => c > 1)
      .map(([k]) => k);
  }, [rows]);

  const enabledCount = display.filter(
    (r, i) => i < display.length - 1 && r.enabled && !isRowEmpty(r),
  ).length;
  const totalCount = Math.max(0, display.length - 1);

  const save = useMutation({
    mutationFn: () =>
      updateEnvironment(
        env.id,
        {
          variables: rows
            .filter((r) => !isRowEmpty(r))
            .map(
              ({ initialValue: _i, serverKey: _sk, ...rest }) =>
                rest as EnvVariable,
            ),
        },
        { snapshot: true },
      ),
    onSuccess: (updated) => {
      // Trust the server's authoritative response — set rows from it
      // FIRST (so the table never blinks empty), then invalidate the
      // global cache so other consumers (sidebars, variable index) refresh.
      const fresh = updated?.variables ?? [];
      setRows(fresh.map(makeRow));
      setReveals({});
      // Push fresh detail into the detail-cache so the next mount of any
      // editor on this env id reads back exactly what the server returned.
      qc.setQueryData(["environment-detail", updated.id, false], updated);
      qc.invalidateQueries({ queryKey: ["environments"] });
      qc.invalidateQueries({ queryKey: ["envs"] }); // useVariableIndex
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const reset = () => {
    setRows((env.variables ?? []).map(makeRow));
    setReveals({});
    toast.success("Reverted to last save");
  };

  /** Fetch the unmasked secrets exactly once per editor session. The eye
   * icon on any secret row triggers this lazily — reveals are persisted
   * locally so flipping the eye on/off afterwards is instant. */
  const ensureRevealed = async () => {
    if (revealedMap || revealLoading) return;
    setRevealLoading(true);
    try {
      const fresh = await getEnvironment(env.id, true);
      const map: Record<string, string> = {};
      (fresh.variables ?? []).forEach((v) => {
        if (v.key) map[v.key] = v.value ?? "";
      });
      setRevealedMap(map);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reveal secrets");
    } finally {
      setRevealLoading(false);
    }
  };

  const visibleValueOf = (r: Row, isRevealedRow: boolean): string => {
    if (r.type !== "SECRET" || !isRevealedRow) return r.value;
    if (revealedMap && r.serverKey && revealedMap[r.serverKey] != null) {
      return revealedMap[r.serverKey];
    }
    return r.value;
  };

  return (
    <div className="space-y-3">
      {/* Postman Headers/Params styled table — checkbox is the per-variable
          ENABLE toggle (not bulk-select). Empty rows auto-disable. */}
      <div
        className="rounded-md border border-border"
        data-testid="vars-direct-table"
      >
        {/* Header row */}
        <div className="grid grid-cols-[44px_1.2fr_1fr_1fr_1.4fr_36px] items-center gap-1 border-b border-border bg-surface/60 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <span
            data-testid="vars-env-enabled-count"
            className="px-1"
            title="Enabled / total"
          >
            {enabledCount}/{totalCount}
          </span>
          <span className="px-2">Key</span>
          <span className="px-2">Initial value</span>
          <span className="px-2">Current value</span>
          <span className="px-2">Description</span>
          <span></span>
        </div>
        {display.map((v, i) => {
          const reveal = !!reveals[i];
          const isDup = duplicateKeys.includes((v.key || "").trim());
          const isTrailer = i === display.length - 1;
          const empty = isRowEmpty(v);
          return (
            <div
              key={i}
              className={cn(
                "group grid grid-cols-[44px_1.2fr_1fr_1fr_1.4fr_36px] items-center gap-1 border-b border-border/60 px-2 py-0.5 last:border-b-0",
                isDup ? "bg-red-500/5" : "hover:bg-hover/30",
                !v.enabled && !empty && "opacity-60",
              )}
              data-testid={`vars-row-line-${i}`}
            >
              <input
                type="checkbox"
                disabled={empty}
                checked={!!v.enabled && !empty}
                onChange={(e) =>
                  updateRow(
                    i,
                    { enabled: e.target.checked },
                    { fromCheckbox: true },
                  )
                }
                data-testid={`vars-row-enabled-${i}`}
                title={
                  empty
                    ? "Add a key/value to enable"
                    : v.enabled
                      ? "Enabled — click to disable"
                      : "Disabled — click to enable"
                }
                className="ml-2 h-3.5 w-3.5"
              />
              {/* KEY */}
              <div className="relative">
                <input
                  value={v.key}
                  onChange={(e) => updateRow(i, { key: e.target.value })}
                  data-testid={`vars-row-key-${i}`}
                  placeholder={
                    isTrailer ? "Add new variable…" : "VARIABLE_NAME"
                  }
                  className={cn(
                    "h-7 w-full bg-transparent px-2 pr-7 font-mono text-xs outline-none",
                    "border-0 border-b border-transparent focus:border-primary",
                    isDup && "text-red-500",
                  )}
                />
                {!isTrailer && (
                  <button
                    onClick={() =>
                      updateRow(i, {
                        type: v.type === "SECRET" ? "DEFAULT" : "SECRET",
                      })
                    }
                    data-testid={`vars-row-keyicon-${i}`}
                    className={cn(
                      "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-hover",
                      v.type === "SECRET" && "text-yellow-500",
                    )}
                    title={
                      v.type === "SECRET"
                        ? "Marked secret — click to make plain"
                        : "Mark as secret"
                    }
                  >
                    <KeyRound className="h-3 w-3" />
                  </button>
                )}
                {isDup && (
                  <span
                    className="pointer-events-none absolute -bottom-3 left-2 text-[9px] text-red-500"
                    data-testid={`vars-row-dup-${i}`}
                  >
                    duplicate key
                  </span>
                )}
              </div>
              {/* INITIAL */}
              <input
                value={v.initialValue}
                onChange={(e) => updateRow(i, { initialValue: e.target.value })}
                data-testid={`vars-row-initial-${i}`}
                placeholder="initial"
                type={v.type === "SECRET" && !reveal ? "password" : "text"}
                className="h-7 w-full bg-transparent px-2 font-mono text-xs outline-none border-0 border-b border-transparent focus:border-primary"
              />
              {/* CURRENT */}
              <div className="relative">
                <input
                  type={v.type === "SECRET" && !reveal ? "password" : "text"}
                  value={visibleValueOf(v, reveal)}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  data-testid={`vars-row-value-${i}`}
                  placeholder="current"
                  className={cn(
                    "h-7 w-full bg-transparent px-2 pr-7 font-mono text-xs outline-none border-0 border-b border-transparent focus:border-primary",
                    v.value !== v.initialValue && "border-yellow-500/60",
                  )}
                />
                {!isTrailer && v.type === "SECRET" && (
                  <button
                    onClick={async () => {
                      const next = !reveals[i];
                      if (next) await ensureRevealed();
                      setReveals((s) => ({ ...s, [i]: next }));
                    }}
                    data-testid={`vars-row-reveal-${i}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-hover"
                    title={reveal ? "Hide secret" : "Reveal secret"}
                  >
                    {revealLoading && !reveals[i] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : reveal ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              {/* DESC */}
              <input
                value={v.description ?? ""}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                data-testid={`vars-row-desc-${i}`}
                placeholder="description"
                className="h-7 w-full bg-transparent px-2 text-xs outline-none border-0 border-b border-transparent focus:border-primary"
              />
              {/* DELETE — hidden on trailer row */}
              {!isTrailer ? (
                <button
                  data-testid={`vars-row-del-${i}`}
                  onClick={() => removeRow(i)}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-hover hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save bar — Reset removed per UX feedback (data is fetched
          fresh on every mount/refresh; the user wanted no manual revert). */}
      <div className="flex items-center justify-between gap-2">
        {duplicateKeys.length > 0 ? (
          <div
            className="flex items-center gap-2 text-[11px] text-red-500"
            data-testid="vars-dup-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Duplicate keys: <strong>{duplicateKeys.join(", ")}</strong>. Each
            key must be unique within this scope.
          </div>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button
            variant="primary"
            data-testid="vars-env-save"
            disabled={!dirty || save.isPending || duplicateKeys.length > 0}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Footer ──────────────────────────────────────────────────────── */
const HowToUseFooter = ({ scope }: { scope: VarScope }) => {
  const tips: Record<VarScope, string[]> = {
    GLOBAL: [
      "Globals are the org-wide defaults — they have the lowest priority.",
      "Anything else (Environment, Project, Collection, Local) overrides them.",
      "Reference any global in a request as " + "`{{KEY}}`" + ".",
    ],
    WORKSPACE: [
      "Project variables apply to every collection in this project automatically.",
      "They are overridden by the active Environment, Collection-level vars and Local.",
      "No activate button needed — they are always in effect for this project.",
    ],
    COLLECTION: [
      "Collection variables are scoped to one collection only.",
      "They beat Project and Globals but lose to active Environment and Local.",
      "No activate button — they apply automatically when a request from this collection runs.",
    ],
    ENVIRONMENT: [
      "Only ONE environment can be active per project at a time.",
      "Active env beats Collection, Project and Globals — but Local still wins.",
      "Use secret-marked variables for tokens — values are masked unless you click Reveal.",
    ],
    LOCAL: [
      "Local variables are runtime-only — they are never persisted.",
      "They are the highest priority — they override every other scope.",
      "Set them in scripts via " + '`pm.variables.set("KEY", value)`' + ".",
    ],
  };
  const list = tips[scope];
  return (
    <footer
      className="border-t border-border bg-surface/60 px-6 py-3"
      data-testid="vars-howto-footer"
    >
      <div className="">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          How to use
        </div>
        <ul className="space-y-1 text-[11px] text-text-secondary">
          {list.map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-2"
              data-testid={`vars-howto-tip-${i}`}
            >
              <CheckSquare className="mt-[1px] h-3 w-3 shrink-0 text-emerald-400" />
              <span
                dangerouslySetInnerHTML={{
                  __html: tip
                    .replace(
                      /`([^`]+)`/g,
                      '<code class="rounded bg-elevated px-1 font-mono">$1</code>',
                    )
                    .replace(
                      /<strong>(.*?)<\/strong>/g,
                      '<strong class="text-text-primary">$1</strong>',
                    ),
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
};
