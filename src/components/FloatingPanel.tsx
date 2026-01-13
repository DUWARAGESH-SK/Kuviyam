import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft, PanelLayout } from '../types';
import { NoteEditor } from './NoteEditor';

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null;
    onSaveNote: (draft: NoteDraft, id?: string) => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote
}) => {
    // Use state with explicit persistence in mind
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);

    // Update internal state when props change (e.g. storage update from another tab)
    useEffect(() => {
        if (initialLayout) {
            setLayout(current => ({
                ...current,
                ...initialLayout
            }));
        }
    }, [initialLayout]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);

    // Drag Handler
    const handleMouseDown = (e: React.MouseEvent) => {
        // Ignore if clicking on interactive elements or resize handle
        if ((e.target as HTMLElement).closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - layout.x,
            y: e.clientY - layout.y
        });
    };

    // Resize Handler
    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
    };

    // Global Mouse Interactions
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // 1. Dragging Logic
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Ensure header stays on screen (top > 0)
                const clampedY = Math.max(0, newY);
                // Ensure strictly within window width roughly
                const clampedX = Math.max(-layout.width + 50, Math.min(window.innerWidth - 50, newX));

                setLayout(prev => ({ ...prev, x: clampedX, y: clampedY }));
            }

            // 2. Resizing Logic
            if (isResizing) {
                // Calculate new dims based on mouse position
                const newWidth = e.clientX - layout.x;
                const newHeight = e.clientY - layout.y;

                // Apply visual constraints (min-width: 300px, min-height: 200px)
                const constrainedWidth = Math.max(300, newWidth);
                const constrainedHeight = Math.max(200, newHeight);

                setLayout(prev => ({ ...prev, width: constrainedWidth, height: constrainedHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                // Persist the final state
                onLayoutChange(layout);
            }
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, layout, onLayoutChange]);

    // -- Render: Minimized State --
    if (layout.isMinimized) {
        return (
            <div
                style={{
                    pointerEvents: 'auto',
                    position: 'fixed',
                    left: layout.x,
                    top: layout.y,
                    zIndex: 2147483647
                }}
                className="no-drag"
            >
                <div
                    className="w-12 h-12 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    style={{
                        width: '48px', height: '48px',
                        backgroundColor: '#24283b',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 2px #7aa2f7'
                    }}
                    onMouseDown={(e) => {
                        // Allow dragging the minimized bubble too!
                        handleMouseDown(e);
                    }}
                    title="Expand Note (Double Click)"
                    onDoubleClick={() => {
                        const newLayout = { ...layout, isMinimized: false };
                        setLayout(newLayout);
                        onLayoutChange(newLayout);
                    }}
                >
                    <span style={{ fontSize: '24px' }}>📝</span>
                </div>

                {/* Helper text if needed */}
                {/* <div style={{ position: 'absolute', top: 50, left: 0, background: 'black', color: 'white', fontSize: 10, padding: 2 }}>{Math.round(layout.x)},{Math.round(layout.y)}</div> */}
            </div>
        );
    }

    // -- Render: Expanded State --
    return (
        <div
            ref={panelRef}
            style={{
                pointerEvents: 'auto',
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: 2147483647,
                backgroundColor: 'rgba(26, 27, 38, 0.98)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
                boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', sans-serif",
                color: '#a9b1d6',
                transition: (isDragging || isResizing) ? 'none' : 'box-shadow 0.2s', // disable transition during drag for performance
                userSelect: 'none' // Prevent text selection while dragging header
            }}
        >
            {/* --- HEADER --- */}
            <div
                style={{
                    height: '40px',
                    background: 'linear-gradient(to right, rgba(36, 40, 59, 1), rgba(36, 40, 59, 0.8))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 16px',
                    cursor: 'grab',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={(e) => (e.target as HTMLElement).style.cursor = 'grab'}
            >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#7aa2f7', textTransform: 'uppercase', letterSpacing: '1px', pointerEvents: 'none' }}>Kuviyam</span>
                <div className="no-drag" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        style={{
                            background: 'none', border: 'none', color: '#787c99', cursor: 'pointer',
                            fontSize: '24px', padding: '0 8px', lineHeight: '20px', fontWeight: 300
                        }}
                        onClick={() => {
                            const newLayout = { ...layout, isMinimized: true };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }}
                        title="Minimize (_)"
                    >
                        -
                    </button>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="no-drag" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', userSelect: 'text' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                    {/* Note Editor gets the remaining space */}
                    <NoteEditor
                        initialNote={note}
                        onSave={onSaveNote}
                        onCancel={() => { }}
                    />
                </div>

                {/* --- RESIZE HANDLE --- */}
                <div
                    className="resize-handle"
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '32px', // Larger hit area
                        height: '32px',
                        cursor: 'se-resize',
                        zIndex: 100, // Top of everything
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '6px'
                    }}
                    onMouseDown={handleResizeStart}
                    title="Drag to Resize"
                >
                    {/* Visual Indicator */}
                    <div style={{
                        width: '12px', height: '12px',
                        borderRight: '3px solid #7aa2f7',
                        borderBottom: '3px solid #7aa2f7',
                        borderRadius: '1px',
                        pointerEvents: 'none'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
