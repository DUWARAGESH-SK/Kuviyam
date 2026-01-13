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
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

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

                // Clamping needed? Let's just allow free movement for now, ensuring header is visible
                const clampedY = Math.max(0, newY);

                setLayout(prev => ({ ...prev, x: newX, y: clampedY }));
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
                onLayoutChange(layout);
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
                    pointerEvents: 'auto',
                    position: 'fixed',
                    left: layout.x,
                    top: layout.y,
                    zIndex: 2147483647
                }}
                className="flex flex-col items-end"
            >
                <div
                    className="w-12 h-12 bg-tokyo-card rounded-full shadow-xl border border-tokyo-accent/50 flex items-center justify-center cursor-move hover:scale-110 transition-transform"
                    onMouseDown={handleMouseDown}
                    style={{
                        width: '48px', height: '48px',
                        backgroundColor: '#24283b',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        border: '2px solid #7aa2f7'
                    }}
                    title="Expand Note"
                    onClick={(e) => {
                        const newLayout = { ...layout, isMinimized: false };
                        setLayout(newLayout);
                        onLayoutChange(newLayout);
                    }}
                >
                    <span style={{ fontSize: '24px' }}>📝</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            style={{
                pointerEvents: 'auto', // CRITICAL: Restore clicks
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: 2147483647,
                backgroundColor: 'rgba(26, 27, 38, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', sans-serif",
                color: '#a9b1d6',
                transition: isDragging || resizeDirection ? 'none' : 'box-shadow 0.2s'
            }}
        >
            {/* Header handled by drag */}
            <div
                style={{
                    height: '40px',
                    background: 'linear-gradient(to right, rgba(36, 40, 59, 0.8), rgba(36, 40, 59, 0.4))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 16px',
                    cursor: 'move',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    userSelect: 'none',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                }}
                onMouseDown={handleMouseDown}
            >
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#7aa2f7', textTransform: 'uppercase', letterSpacing: '1px' }}>Kuviyam</span>
                <div className="no-drag" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        style={{
                            background: 'none', border: 'none', color: '#787c99', cursor: 'pointer',
                            fontSize: '18px', padding: '4px', lineHeight: 1
                        }}
                        onClick={() => {
                            const newLayout = { ...layout, isMinimized: true };
                            setLayout(newLayout);
                            onLayoutChange(newLayout);
                        }}
                        title="Minimize"
                    >
                        −
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="no-drag" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
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
                        width: '24px',
                        height: '24px',
                        cursor: 'se-resize',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '4px'
                    }}
                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                    title="Drag to resize"
                >
                    <div style={{
                        width: '12px', height: '12px',
                        borderRight: '3px solid rgba(122, 162, 247, 0.5)',
                        borderBottom: '3px solid rgba(122, 162, 247, 0.5)',
                        borderBottomRightRadius: '2px'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
