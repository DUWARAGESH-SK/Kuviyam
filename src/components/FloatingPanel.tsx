import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft, PanelLayout } from '../types';
import { NoteEditor } from './NoteEditor';

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null; // The active note to display
    onSaveNote: (draft: NoteDraft, id?: string) => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote
}) => {
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

    // Sync internal state if needed (e.g. from storage load)
    useEffect(() => {
        if (initialLayout) {
            setLayout(prev => ({ ...prev, ...initialLayout }));
        }
    }, [initialLayout]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - layout.x,
            y: e.clientY - layout.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizeDirection(direction);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Basic viewport clamping
                const clampedX = Math.max(0, Math.min(window.innerWidth - layout.width, newX));
                const clampedY = Math.max(0, Math.min(window.innerHeight - 30, newY));

                setLayout(prev => ({ ...prev, x: clampedX, y: clampedY }));
            } else if (resizeDirection) {
                let newWidth = layout.width;
                let newHeight = layout.height;

                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(300, e.clientX - layout.x);
                }
                if (resizeDirection.includes('s')) {
                    newHeight = Math.max(200, e.clientY - layout.y);
                }

                setLayout(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || resizeDirection) {
                setIsDragging(false);
                setResizeDirection(null);
                onLayoutChange(layout); // Persist changes
            }
        };

        if (isDragging || resizeDirection) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, resizeDirection, layout, onLayoutChange]);

    if (layout.isMinimized) {
        return (
            <div
                style={{
                    position: 'fixed',
                    left: layout.x,
                    top: layout.y,
                    zIndex: 999999
                }}
                className="flex flex-col items-end"
            >
                <div
                    className="w-12 h-12 bg-tokyo-card rounded-full shadow-xl border border-tokyo-accent/50 flex items-center justify-center cursor-move hover:scale-110 transition-transform"
                    onMouseDown={handleMouseDown}
                    style={{ color: '#7aa2f7', fontSize: '24px', cursor: 'pointer' }}
                    title="Expand Note"
                    onClick={(e) => {
                        const newLayout = { ...layout, isMinimized: false };
                        setLayout(newLayout);
                        onLayoutChange(newLayout);
                    }}
                >
                    📝
                </div>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: 999999,
                backgroundColor: '#1a1b26cc', // Fallback
                backdropFilter: 'blur(12px)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'sans-serif',
                color: '#a9b1d6'
            }}
        >
            {/* Header handled by drag */}
            <div
                style={{
                    height: '32px',
                    backgroundColor: 'rgba(36, 40, 59, 0.5)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 12px',
                    cursor: 'move',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
            >
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7aa2f7', letterSpacing: '0.05em' }}>KUVIYAM</span>
                <div className="no-drag" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        style={{ background: 'none', border: 'none', color: '#787c99', cursor: 'pointer', fontSize: '14px' }}
                        onClick={() => {
                            const newLayout = { ...layout, isMinimized: true };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }}
                    >
                        _
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="no-drag" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    <NoteEditor
                        initialNote={note}
                        onSave={onSaveNote}
                        onCancel={() => { }}
                    />
                </div>

                {/* Resize Handle (Bottom Right) */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '16px',
                        height: '16px',
                        cursor: 'se-resize',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '2px'
                    }}
                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                >
                    <div style={{ width: '8px', height: '8px', borderRight: '2px solid #787c99', borderBottom: '2px solid #787c99' }}></div>
                </div>
            </div>
        </div>
    );
};
