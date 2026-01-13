import React, { useState } from 'react';
import { Note } from '../types';

interface FloatingNoteProps {
    note: Note;
    onUpdate: (id: string, position: { x: number, y: number }) => void;
}

export const FloatingNote: React.FC<FloatingNoteProps> = ({ note, onUpdate }) => {
    const [position, setPosition] = useState(note.position || { x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const newPos = {
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            };
            setPosition(newPos);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            onUpdate(note.id, position);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 99999,
                backgroundColor: '#1a1b26',
                color: '#a9b1d6',
                padding: '12px',
                borderRadius: '8px',
                width: '200px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                border: '1px solid #7aa2f7',
                fontFamily: 'sans-serif'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                style={{ cursor: 'move', borderBottom: '1px solid #ffffff20', paddingBottom: '4px', marginBottom: '8px', fontWeight: 'bold' }}
                onMouseDown={handleMouseDown}
            >
                {note.title || 'Note'}
            </div>
            <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {note.content}
            </div>
        </div>
    );
};
