/**
 * Global timezone formatter — single source of truth for "when did this
 * happen" UI strings across the app.
 *
 * Why we need this:
 *   • All backend timestamps are persisted as UTC ISO strings.
 *   • Users on a global team want to see times in their own zone.
 *   • Until Settings → Display → Timezone is wired up, we default to
 *     the browser's IANA zone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
 *
 * Usage:
 *   import { fmtDateTime } from '@/lib/timezone';
 *   <span>{fmtDateTime(row.executedAt)}</span>
 *
 *   // To change the global zone (e.g. from a Settings page):
 *   import { setGlobalTimezone } from '@/lib/timezone';
 *   setGlobalTimezone('Asia/Kolkata');
 */

const STORAGE_KEY = 'forgeq.timezone';

let _zone: string =
  (typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY)) ||
  (typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC') ||
  'UTC';

type Listener = (zone: string) => void;
const listeners = new Set<Listener>();

export const getGlobalTimezone = (): string => _zone;

export const setGlobalTimezone = (z: string) => {
  _zone = z || 'UTC';
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, _zone); } catch { /* ignore */ }
  }
  listeners.forEach((fn) => { try { fn(_zone); } catch { /* ignore */ } });
};

export const subscribeTimezone = (fn: Listener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

/** Coerce backend value to Date (handles ISO string, epoch seconds, epoch ms). */
const toDate = (v: unknown): Date | null => {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'string') {
    const n = Number(v);
    if (/^-?\d+(\.\d+)?$/.test(v) && !Number.isNaN(n)) return new Date(n < 1e12 ? n * 1000 : n);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (opts: Intl.DateTimeFormatOptions, zone = _zone) => {
  const key = zone + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, { ...opts, timeZone: zone });
    fmtCache.set(key, f);
  }
  return f;
};

export const fmtDateTime = (v: unknown, zone = _zone): string => {
  const d = toDate(v);
  if (!d) return '—';
  return fmt({ year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }, zone).format(d);
};

export const fmtDate = (v: unknown, zone = _zone): string => {
  const d = toDate(v);
  if (!d) return '—';
  return fmt({ year: 'numeric', month: 'short', day: '2-digit' }, zone).format(d);
};

export const fmtTime = (v: unknown, zone = _zone): string => {
  const d = toDate(v);
  if (!d) return '—';
  return fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }, zone).format(d);
};

/** "5 minutes ago", "2 hours ago" — clamped to 7 days, then fall through to fmtDate. */
export const fmtRelative = (v: unknown): string => {
  const d = toDate(v);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(d);
};

/** Common IANA zones offered in Settings pickers. */
export const COMMON_TIMEZONES: { id: string; label: string }[] = [
  { id: 'UTC',                 label: 'UTC' },
  { id: 'Asia/Kolkata',        label: 'India · Kolkata (IST)' },
  { id: 'America/Los_Angeles', label: 'US · Los Angeles (PT)' },
  { id: 'America/New_York',    label: 'US · New York (ET)' },
  { id: 'Europe/London',       label: 'UK · London' },
  { id: 'Europe/Berlin',       label: 'Europe · Berlin' },
  { id: 'Asia/Singapore',      label: 'Singapore' },
  { id: 'Asia/Tokyo',          label: 'Japan · Tokyo' },
  { id: 'Australia/Sydney',    label: 'Australia · Sydney' },
];
