/**
 * AppIcons — single source of truth for every icon in the application.
 *
 * Why this file exists:
 *   The user wants ONE icon per concept across the entire UI (e.g. the
 *   collection icon must always be the same wherever a collection is
 *   referenced). Importing each icon directly from `lucide-react`
 *   everywhere drifts over time and produces inconsistent results.
 *
 * Design rules (intentionally simple — no Lordicon JSON swap-outs):
 *   1. Each `IconName` maps to ONE Lucide component. The same SVG is rendered
 *      idle, hovered, active, autoplay — the SHAPE never changes. This kills
 *      the "icon turns into a different icon on click/hover" bug class.
 *   2. Animations are pure CSS keyframes defined in tailwind.css and triggered
 *      by either:
 *        • self-hover                                      `:hover`
 *        • parent (`.group`) hover                         `.group:hover &`
 *        • the `active`  prop (kept playing while active)  `.app-icon-active`
 *        • the `autoPlay` prop (re-fires every 3s)         `key={tick}`
 *      No external Lottie payload is fetched, so animations stay zero-bandwidth
 *      and fully theme-coloured (they inherit `currentColor`).
 *   3. To change the icon for a given concept update ICON_MAP — every caller
 *      that uses `<AppIcon name="..." />` picks it up automatically.
 */
import { useEffect, useState } from 'react';
import {
  type LucideIcon,
  Boxes, Folder, FolderOpen, FileCode2, FileText, Server, Database,
  Activity, Heart, Mail, Bell, Bug, FileWarning, MessageSquare,
  Plug, Webhook, Trash2, RotateCcw, Edit3, Plus, Check, X, Search,
  Settings, Users, User, Crown, Lock, Unlock, Eye, EyeOff,
  PlayCircle, PauseCircle, StopCircle, RefreshCw, Send, Copy,
  ClipboardList, BookOpen, Compass, LayoutDashboard, LineChart,
  Globe, Link, Code2, Terminal, Zap, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, Star, Tag, History, Variable,
  TestTube2, Sparkles, Shield, FlaskConical,Building2
} from 'lucide-react';
import { cn } from '@/utils/cn';

// "Replay" doesn't exist in lucide-react 0.561 — use RotateCcw as the visual.
const ReplayIcon: LucideIcon = RotateCcw;
// `Variable` (math `x` glyph) is available from 0.460+, but guard anyway.
const VariableIcon: LucideIcon = (Variable as LucideIcon | undefined) ?? FileCode2;

export type IconName =
  // Domain entities
  | 'project' | 'collection' | 'folder' | 'request' | 'environment'
  | 'mock' | 'monitor' | 'heartbeat' | 'digest' | 'webhook' | 'integration'
  | 'audit' | 'trash' | 'apidoc' | 'public-hub' | 'testing' | 'load-test'
  | 'functional-test' | 'spec' | 'mcp' | 'reports' | 'flask'
  | 'history' | 'replay' | 'variables' | 'dashboard'
  | 'building'
  // Actions
  | 'create' | 'edit' | 'delete' | 'restore' | 'duplicate' | 'refresh'
  | 'send' | 'copy' | 'rotate' | 'pause' | 'play' | 'stop' | 'search'
  | 'settings' | 'close' | 'check'
  // Status / meta
  | 'success' | 'warn' | 'error' | 'info' | 'pending' | 'critical'
  | 'tag' | 'star' | 'lock' | 'unlock' | 'visible' | 'hidden'
  // People
  | 'user' | 'team' | 'owner'
  // Misc surfaces
  | 'globe' | 'link' | 'code' | 'terminal' | 'zap' | 'message'
  | 'sparkles' | 'shield';

type AnimPreset = 'pop' | 'wiggle' | 'spin' | 'pulse' | 'bounce' | 'float';

interface IconEntry {
  /** Lucide icon used everywhere (idle + animated). */
  static: LucideIcon;
  /** CSS animation preset (defined in tailwind.css). */
  hover: AnimPreset;
}

/** SINGLE SOURCE OF TRUTH — change an icon here, the whole app updates.
 *
 *  Each concept has ONE Lucide icon. Idle + animated render the SAME glyph;
 *  only its transform animates. This guarantees "Variables icon" looks
 *  identical wherever it appears (left rail, right panel, empty state, etc.). */
const ICON_MAP: Record<IconName, IconEntry> = {
  // Domain entities
  project:          { static: Boxes,           hover: 'pop' },
  collection:       { static: FolderOpen,      hover: 'wiggle' },
  folder:           { static: Folder,          hover: 'wiggle' },
  request:          { static: FileCode2,       hover: 'pop' },
  environment:      { static: Server,          hover: 'pulse' },
  mock:             { static: Database,        hover: 'pulse' },
  monitor:          { static: Activity,        hover: 'pulse' },
  heartbeat:        { static: Heart,           hover: 'bounce' },
  digest:           { static: Mail,            hover: 'wiggle' },
  webhook:          { static: Webhook,         hover: 'spin' },
  integration:      { static: Plug,            hover: 'wiggle' },
  audit:            { static: ClipboardList,   hover: 'pop' },
  trash:            { static: Trash2,          hover: 'wiggle' },
  apidoc:           { static: BookOpen,        hover: 'pop' },
  'public-hub':     { static: Compass,         hover: 'spin' },
  testing:          { static: TestTube2,       hover: 'wiggle' },
  'load-test':      { static: LineChart,       hover: 'pop' },
  'functional-test':{ static: Bug,             hover: 'wiggle' },
  spec:             { static: FileText,        hover: 'pop' },
  mcp:              { static: Code2,           hover: 'pulse' },
  reports:          { static: LineChart,       hover: 'pop' },
  history:          { static: History,         hover: 'spin' },
  replay:           { static: ReplayIcon,      hover: 'spin' },
  variables:        { static: VariableIcon,    hover: 'pop' },
  dashboard:        { static: LayoutDashboard, hover: 'pop' },
  sparkles:         { static: Sparkles,        hover: 'pulse' },
  shield:           { static: Shield,          hover: 'pop' },
  // Actions
  create:           { static: Plus,            hover: 'pop' },
  edit:             { static: Edit3,           hover: 'wiggle' },
  delete:           { static: Trash2,          hover: 'wiggle' },
  restore:          { static: RotateCcw,       hover: 'spin' },
  duplicate:        { static: Copy,            hover: 'pop' },
  refresh:          { static: RefreshCw,       hover: 'spin' },
  send:             { static: Send,            hover: 'pop' },
  copy:             { static: Copy,            hover: 'pop' },
  rotate:           { static: RotateCcw,       hover: 'spin' },
  pause:            { static: PauseCircle,     hover: 'pulse' },
  play:             { static: PlayCircle,      hover: 'pop' },
  stop:             { static: StopCircle,      hover: 'pulse' },
  search:           { static: Search,          hover: 'wiggle' },
  settings:         { static: Settings,        hover: 'spin' },
  close:            { static: X,               hover: 'pop' },
  check:            { static: Check,           hover: 'pop' },
  // Status
  success:          { static: CheckCircle2,    hover: 'pop' },
  warn:             { static: AlertTriangle,   hover: 'wiggle' },
  error:            { static: AlertCircle,     hover: 'wiggle' },
  info:             { static: Bell,            hover: 'wiggle' },
  pending:          { static: Clock,           hover: 'spin' },
  critical:         { static: FileWarning,     hover: 'wiggle' },
  tag:              { static: Tag,             hover: 'pop' },
  star:             { static: Star,            hover: 'pop' },
  lock:             { static: Lock,            hover: 'pop' },
  unlock:           { static: Unlock,          hover: 'pop' },
  visible:          { static: Eye,             hover: 'pop' },
  hidden:           { static: EyeOff,          hover: 'pop' },
  // People
  user:             { static: User,            hover: 'pop' },
  team:             { static: Users,           hover: 'pop' },
  owner:            { static: Crown,           hover: 'wiggle' },
  // Misc
  globe:            { static: Globe,           hover: 'spin' },
  link:             { static: Link,            hover: 'pop' },
  code:             { static: Code2,           hover: 'pulse' },
  terminal:         { static: Terminal,        hover: 'pulse' },
  zap:              { static: Zap,             hover: 'pop' },
  flask:            { static: FlaskConical,    hover: 'pop' },
  message:          { static: MessageSquare,   hover: 'wiggle' },
   building:         { static: Building2,       hover: 'pop' },
};

interface AppIconProps {
  name: IconName;
  /** Static (no animation) by default. Pass `animated` to enable hover /
   *  parent-hover / autoplay animations on the icon. */
  animated?: boolean;
  /** When true, the animation preset stays running (used to express "active
   *  tab" without requiring the user to mouse over it). */
  active?: boolean;
  /** Tailwind sizing. Defaults to `h-4 w-4`. */
  className?: string;
  /** Extra colour / wrapper classes for the surrounding span. */
  wrapperClassName?: string;
  /** Auto-replay the animation every 3s on mount (useful for empty states /
   *  hero cards). The icon SHAPE stays identical, only its transform animates. */
  autoPlay?: boolean;
  /** Pixel size override (otherwise uses `className` h-/w- utilities). */
  size?: number;
  'aria-label'?: string;
  'data-testid'?: string;
}

/**
 * Render a Lucide icon wrapped in a span that owns the animation classes.
 *
 *  - `animated` adds `app-icon-anim app-icon-anim-{preset}` so the keyframe
 *    fires on `:hover` AND on `.group:hover &` (parent-hover support — the
 *    icon animates whenever the surrounding button/tab is hovered, not only
 *    when the cursor is exactly over the icon). See tailwind.css for rules.
 *  - `active` adds `app-icon-active` which keeps the preset playing on a
 *    gentle infinite loop — used by selected sidebar entries.
 *  - `autoPlay` re-mounts the wrapper every 3s by bumping a key, so the
 *    "play once" preset re-fires on a timer (no infinite spin/wiggle).
 */
export const AppIcon = ({
  name, animated = false, active = false, className, wrapperClassName,
  autoPlay = false, size, ...rest
}: AppIconProps) => {
  const entry = ICON_MAP[name];
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 3000);
    return () => window.clearInterval(id);
  }, [autoPlay]);

  if (!entry) return null;
  const Icon = entry.static;

  const sizeStyle = size ? { width: size, height: size } : undefined;
  const iconClass = cn(size ? '' : 'h-4 w-4', className);
  const wrapperClasses = cn(
    'inline-flex shrink-0',
    animated && `app-icon-anim app-icon-anim-${entry.hover}`,
    active && 'app-icon-active',
    autoPlay && 'app-icon-autoplay',
    wrapperClassName,
  );

  return (
    <span
      key={autoPlay ? tick : undefined}
      className={wrapperClasses}
      data-app-icon={name}
      data-testid={rest['data-testid']}
      aria-label={rest['aria-label']}
    >
      <Icon className={iconClass} style={sizeStyle} />
    </span>
  );
};

/**
 * Convenience helper for components that need just the underlying Lucide
 * component reference (e.g. `<button icon={getIconComponent('collection')} />`).
 * Prefer `<AppIcon />` for new code.
 */
export const getIconComponent = (name: IconName): LucideIcon => ICON_MAP[name].static;
