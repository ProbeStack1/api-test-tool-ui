/**
 * TerminalDrawer — owns positioning (bottom slide-up OR right slide-in),
 * resize, and the dock-toggle button. Mounts once in {@link AppShell}
 * and is hidden unless {@code useTerminal().open} is true.
 *
 * Resizing: drag the small handle on the inner edge (top edge for
 * bottom position, left edge for right position). Min/max are
 * enforced inside the store.
 */
import { useEffect, useRef } from "react";
import { useTerminal } from "@/stores/terminal.store";
import { TerminalPane } from "./TerminalPane";
import { cn } from "@/utils/cn";

export const TerminalDrawer = () => {
  const open = useTerminal((s) => s.open);
  const position = useTerminal((s) => s.position);
  const height = useTerminal((s) => s.bottomHeight);
  const width = useTerminal((s) => s.rightWidth);
  const setOpen = useTerminal((s) => s.setOpen);
  const setHeight = useTerminal((s) => s.setBottomHeight);
  const setWidth = useTerminal((s) => s.setRightWidth);

  // Global hotkey — Ctrl/Cmd+` toggles the terminal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        // Don't capture Esc inside text inputs.
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            (t as HTMLElement).isContentEditable)
        )
          return;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Drag-to-resize
  const dragRef = useRef<{
    start: number;
    orig: number;
    axis: "y" | "x";
  } | null>(null);
  const onDragStart = (e: React.PointerEvent) => {
    const axis = position === "bottom" ? "y" : "x";
    dragRef.current = {
      start: axis === "y" ? e.clientY : e.clientX,
      orig: axis === "y" ? height : width,
      axis,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.axis === "y") {
      // dragging top edge of bottom drawer up = larger height
      const delta = d.start - e.clientY;
      setHeight(d.orig + delta);
    } else {
      const delta = d.start - e.clientX;
      setWidth(d.orig + delta);
    }
  };
  const onDragEnd = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  const isBottom = position === "bottom";

  return (
    <div
      data-testid="terminal-drawer"
      className={cn(
        "fixed z-40 flex flex-col border bg-surface shadow-2xl",
        isBottom
          ? // sits above the 6px status bar
            "bottom-6 left-0 right-0 border-t border-border"
          : "bottom-6 right-0 top-12 border-l border-border",
      )}
      style={isBottom ? { height: `${height}px` } : { width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        data-testid="terminal-drawer-resize"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className={cn(
          "absolute z-50 bg-transparent transition-colors hover:bg-primary/30",
          isBottom
            ? "left-0 right-0 top-0 h-1 cursor-row-resize"
            : "bottom-0 left-0 top-0 w-1 cursor-col-resize",
        )}
      />

      <TerminalPane />
    </div>
  );
};
