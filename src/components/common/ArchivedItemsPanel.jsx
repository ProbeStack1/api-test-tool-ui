import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Archive, RefreshCw, RotateCcw, Trash2, X, Clock, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

/**
 * Inline archived-items panel. Renders as a full-area panel (same footprint
 * as the editor) so callers can swap their main content area between
 * editor-view and archive-view. No overlay / drawer / backdrop.
 *
 * Props:
 *   - title:               string
 *   - subtitle:            string
 *   - onClose:             () => void
 *   - fetchArchived:       () => Promise<item[]> or { items }
 *   - onRestore:           (id) => Promise<void>
 *   - onPermanentDelete:   (id) => Promise<void>
 *   - canAct:              (item) => boolean
 *   - refreshKey:          any — bump to force a refetch
 */
export function ArchivedItemsView({
  title = 'Archived items',
  subtitle,
  onClose,
  fetchArchived,
  onRestore,
  onPermanentDelete,
  canAct = () => true,
  refreshKey,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchArchived();
      setItems(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      toast.error('Failed to load archived items');
    } finally {
      setLoading(false);
    }
  }, [fetchArchived]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => (i.name || '').toLowerCase().includes(q));
  }, [items, search]);

  const daysLeft = (iso) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleRestore = async (item) => {
    setBusyId(item.id);
    try {
      await onRestore(item.id);
      toast.success('Restored');
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      toast.error('Restore failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (item) => {
    if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await onPermanentDelete(item.id);
      toast.success('Permanently deleted');
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card-bg)]" data-testid="archive-view">
      {/* Header */}
      <div className="px-5 py-3 border-b border-dark-700 bg-[var(--color-card-bg)]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Archive className="h-4 w-4 text-amber-400" />
          </div>
         <div className="min-w-0 flex gap-4 items-end">
  <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-none mb-[-1px]">
    {title}
  </h3>
  <p className="text-xs text-[var(--color-text-secondary)] leading-none">
    [ {subtitle || `${items.length} archived — auto-purge by retention`} ]
   </p>
</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-50"
            title="Refresh"
            data-testid="archive-view-refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-700"
              title="Close archive view"
              data-testid="archive-view-close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-2.5 border-b border-dark-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived items..."
            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40"
            data-testid="archive-view-search"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-probestack-bg">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="h-20 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-sm text-[var(--color-text-primary)]">
              {items.length === 0 ? 'Nothing archived' : 'No matches'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {items.length === 0
                ? 'Archived items appear here and auto-purge after their retention period.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-dark-700">
            {filtered.map((item) => {
              const left = daysLeft(item.archiveExpiresAt);
              const allowed = canAct(item);
              const busy = busyId === item.id;
              return (
                <li key={item.id} className="px-5 py-3 hover:bg-dark-700/20" data-testid={`archive-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {left != null && (
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border',
                              left <= 2
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : left <= 7
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {left === 0 ? 'Expires today' : `${left}d left`}
                          </span>
                        )}
                        {item.archiveRetentionDays && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-dark-700 text-gray-400 border border-dark-600">
                            {item.archiveRetentionDays}d retention
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={!allowed || busy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={allowed ? 'Restore' : 'Not authorised to restore'}
                        data-testid={`restore-${item.id}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={!allowed || busy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={allowed ? 'Delete permanently' : 'Not authorised to delete'}
                        data-testid={`permanent-delete-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Toolbar trigger button that shows a live archived-count badge. Pairs with
 * ArchivedItemsView (caller toggles the view mode).
 *
 * Props:
 *   - active:          boolean — whether the archive view is currently shown
 *   - onToggle:        () => void
 *   - fetchArchived:   () => Promise<item[]>  — polled lightly for count
 *   - pollKey:         any — bump to refresh the badge
 *   - label:           string
 */
export function ArchiveViewTrigger({
  active,
  onToggle,
  fetchArchived,
  pollKey = 0,
  label = 'Archive',
}) {
  const [count, setCount] = useState(0);
  const [countKnown, setCountKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchArchived();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.items || []);
        setCount(list.length);
        setCountKnown(true);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [fetchArchived, pollKey]);

  return (
    <button
      onClick={onToggle}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors',
        active
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
          : 'bg-[var(--color-card-bg)] border-dark-600 text-[var(--color-text-primary)] hover:bg-dark-700 hover:border-dark-500'
      )}
      title={active ? 'Hide archive view' : 'Show archive view'}
      data-testid="archive-view-trigger"
    >
      <Archive className={clsx('h-3.5 w-3.5', active ? 'text-amber-300' : 'text-amber-400')} />
      <span>{label}</span>
      {countKnown && count > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1.5 text-[10px] font-semibold rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/30">
          {count}
        </span>
      )}
    </button>
  );
}

// Default export kept for backwards compatibility — combined view+trigger
// is no longer used (callers now render the pieces inline themselves).
export default ArchivedItemsView;
