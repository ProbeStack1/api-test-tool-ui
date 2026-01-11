import React, { useState, useEffect, useRef } from 'react';

export default function ResizablePanel({ children, defaultWidth = 420, minWidth = 300, maxWidth = 800 }) {
    const [width, setWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const diff = e.clientX - startXRef.current;
            const newWidth = Math.min(Math.max(minWidth, startWidthRef.current + diff), maxWidth);
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, minWidth, maxWidth]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = width;
    };

    return (
        <div 
            ref={panelRef}
            className="flex flex-col border-r border-dark-700 bg-dark-800/50 backdrop-blur-sm shrink-0 relative"
            style={{ width: `${width}px` }}
        >
            {children}
            <div
                onMouseDown={handleMouseDown}
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10 group"
                style={{ cursor: 'col-resize' }}
            >
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-1 h-8 bg-dark-600 rounded-full group-hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
}

