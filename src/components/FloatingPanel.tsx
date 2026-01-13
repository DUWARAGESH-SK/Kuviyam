import React, { useState, useEffect } from 'react';
import type { Note, NoteDraft, PanelLayout } from '../types';
import { NoteEditor } from './NoteEditor';

interface FloatingPanelProps {
    initialLayout: PanelLayout;
    onLayoutChange: (layout: PanelLayout) => void;
    note: Note | null;
    onSaveNote: (draft: NoteDraft, id?: string) => void;
    onClose?: () => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    initialLayout,
    onLayoutChange,
    note,
    onSaveNote,
    onClose
}) => {
    const [layout, setLayout] = useState<PanelLayout>(initialLayout);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (initialLayout) setLayout(prev => ({ ...prev, ...initialLayout }));
    }, [initialLayout]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.no-drag')) return;

        setIsDragging(true);
        setDragOffset({ x: e.clientX - layout.x, y: e.clientY - layout.y });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                setLayout(prev => ({ ...prev, x: newX, y: Math.max(0, newY) }));
            }

            if (isResizing) {
                const newWidth = Math.max(350, e.clientX - layout.x);
                const newHeight = Math.max(300, e.clientY - layout.y);
                setLayout(prev => ({ ...prev, width: newWidth, height: newHeight }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
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

    return (
        <div
            style={{
                pointerEvents: 'auto',
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                backgroundColor: 'rgba(26, 27, 38, 0.98)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(122, 162, 247, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', -apple-system, sans-serif",
                color: '#a9b1d6',
                userSelect: 'none',
                overflow: 'hidden',
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.3s ease'
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: '56px',
                    background: 'linear-gradient(135deg, rgba(122, 162, 247, 0.15) 0%, rgba(36, 40, 59, 0.95) 100%)',
                    borderBottom: '1px solid rgba(122, 162, 247, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 20px',
                    cursor: 'grab',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px'
                }}
                onMouseDown={handleMouseDown}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'none' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7aa2f7 0%, #bb9af7 100%)',
                        boxShadow: '0 0 12px rgba(122, 162, 247, 0.6)'
                    }}></div>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#7aa2f7',
                        letterSpacing: '0.5px'
                    }}>
                        Kuviyam Notes
                    </span>
                </div>

                <div className="no-drag" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onClose && (
                        <button
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#a9b1d6',
                                cursor: 'pointer',
                                fontSize: '18px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                padding: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(122, 162, 247, 0.4)';
                                e.currentTarget.style.color = '#7aa2f7';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.color = '#a9b1d6';
                            }}
                            onClick={onClose}
                            title="Close Panel (Return to Popup)"
                        >
                            ←
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="no-drag" style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'text',
                background: 'rgba(26, 27, 38, 0.6)'
            }}>
                <NoteEditor initialNote={note} onSave={onSaveNote} onCancel={() => { }} />

                {/* Resize Handle */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '40px',
                        height: '40px',
                        cursor: 'nwse-resize',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        padding: '8px',
                        transition: 'opacity 0.2s ease',
                        opacity: 0.4
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizing(true);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                    title="Drag to Resize"
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRight: '3px solid #7aa2f7',
                        borderBottom: '3px solid #7aa2f7',
                        borderBottomRightRadius: '4px',
                        pointerEvents: 'none',
                        boxShadow: '0 0 8px rgba(122, 162, 247, 0.3)'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
