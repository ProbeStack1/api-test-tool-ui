import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function ResizableBottomPanel({ 
  children, 
  defaultHeight = 256, 
  minHeight = 100, 
  maxHeight = 600,
  collapsed = false,
  onCollapseChange
}) {
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const diff = startYRef.current - e.clientY; // Inverted because we're dragging up
      const newHeight = Math.min(Math.max(minHeight, startHeightRef.current + diff), maxHeight);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minHeight, maxHeight]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  };

  return (
    <div 
      ref={panelRef}
      className={clsx(
        "border-t border-dark-700 bg-dark-800 flex flex-col transition-all relative",
        collapsed ? "h-8" : ""
      )}
      style={collapsed ? {} : { height: `${height}px` }}
    >
      {/* Resize Handle */}
      {!collapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-primary/50 transition-colors z-20 group"
          style={{ cursor: 'row-resize' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-dark-600 rounded-full group-hover:bg-primary opacity-30 group-hover:opacity-100 transition-opacity"></div>
        </div>
      )}
      {children}
    </div>
  );
}

