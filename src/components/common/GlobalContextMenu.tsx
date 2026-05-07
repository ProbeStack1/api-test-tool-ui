/**
 * GlobalContextMenu — replaces the browser's default right-click anywhere
 * on the app, except where a child has its own (rows in the sidebar,
 * request tabs, etc. already call `e.preventDefault()` + `stopPropagation`,
 * so this listener never fires for them).
 *
 * The default menu shows app-wide actions: Tools (with submenu of every
 * primary feature), New project, New request, Settings, Reload, Copy.
 *
 * To add a new top-level item or extend the Tools submenu, edit
 * `buildDefaultItems()` below.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, FolderPlus, FilePlus, Settings as SettingsIcon, RotateCcw, Copy,
  Clipboard, FlaskConical, Database, Variable, Zap, Activity, BookOpen,
  ListChecks, MessageSquareCode, Boxes, Plug,
} from 'lucide-react';
import { useRowContextMenu } from '@/components/ui/RowContextMenu';
import type { RowContextItem } from '@/components/ui/RowContextMenu';
import { toast } from 'sonner';

export const GlobalContextMenu = () => {
  const navigate = useNavigate();
  const ctx = useRowContextMenu();

  /** All primary tools live here — extend the array to expand the submenu. */
  const toolsSubmenu: RowContextItem[] = [
    { groupLabel: 'API Tools' },
    { icon: FlaskConical, label: 'API Tester',     onClick: () => navigate('/projects/collections') },
    { icon: BookOpen,     label: 'API Docs',       onClick: () => navigate('/projects/api-docs') },
    { icon: Boxes,        label: 'Mock Servers',   onClick: () => navigate('/projects/mocks') },
    { icon: Plug,         label: 'MCP Catalog',    onClick: () => navigate('/projects/mcp') },
    { separator: true },
    { groupLabel: 'Workspace' },
    { icon: Variable,     label: 'Environments',   onClick: () => navigate('/projects/variables') },
    { icon: Database,     label: 'Data Sources',   onClick: () => navigate('/projects/integrations') },
    { icon: ListChecks,   label: 'Test Suites',    onClick: () => navigate('/projects/testing') },
    { icon: Activity,     label: 'Monitors',       onClick: () => navigate('/projects/monitors') },
    { icon: Zap,          label: 'Heartbeats',     onClick: () => navigate('/projects/heartbeats') },
    { separator: true },
    { icon: MessageSquareCode, label: 'AI Chatbot',  onClick: () => toast.info('Use the floating chatbot in the bottom-right corner') },
  ];

  const buildDefaultItems = (): RowContextItem[] => [
    { icon: Wrench,      label: 'Tools',           submenu: toolsSubmenu },
    { separator: true },
    { icon: FolderPlus,  label: 'New project',     onClick: () => navigate('/projects/manage?create=1') },
    { icon: FilePlus,    label: 'New request',     onClick: () => navigate('/projects/collections') },
    { separator: true },
    { icon: Copy,        label: 'Copy',            onClick: () => { document.execCommand('copy'); } },
    { icon: Clipboard,   label: 'Paste',           onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
          if (el && ('value' in el)) {
            const start = el.selectionStart ?? el.value.length;
            const end   = el.selectionEnd   ?? el.value.length;
            el.value = el.value.slice(0, start) + text + el.value.slice(end);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            toast.info('Paste target unsupported here');
          }
        } catch {
          toast.error('Clipboard access denied');
        }
      },
    },
    { separator: true },
    { icon: RotateCcw,   label: 'Reload page',     onClick: () => window.location.reload(), shortcut: 'F5' },
    { icon: SettingsIcon, label: 'Settings',       onClick: () => navigate('/projects/settings'), shortcut: '⌘,' },
  ];

  useEffect(() => {
    // Document-level fallback for the global right-click menu.
    // Row-level handlers already call `preventDefault()` + `stopPropagation()`,
    // so this only runs on areas with no specific handler.
    const onContext = (e: globalThis.MouseEvent) => {
      // Don't hijack right-click inside text inputs / textareas / contenteditables —
      // users expect the native spell-check, undo, paste menu there.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      e.preventDefault();
      // Reuse the same hook surface — fake a React MouseEvent for `openAt`.
      ctx.openAt(
        { clientX: e.clientX, clientY: e.clientY, preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.MouseEvent,
        buildDefaultItems(),
      );
    };
    document.addEventListener('contextmenu', onContext);
    return () => document.removeEventListener('contextmenu', onContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return ctx.portal;
};
