import React from 'react';
import type { Note } from '../../../types';

interface NoteCardProps {
    note: Note;
    onDelete: (id: string) => void;
    onClick: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onClick }) => {
    return (
        <div
            className="group relative p-4 rounded-lg bg-tokyo-card border border-white/5 hover:border-tokyo-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-tokyo-accent/5 cursor-pointer animate-slide-up"
            onClick={() => onClick(note)}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-tokyo-accent truncate pr-6 text-shadow flex-1">
                    {note.title || 'Untitled Note'}
                </h3>
                {note.pinned && <span className="text-xs text-tokyo-warning">📌</span>}
            </div>

            <p className="text-sm text-tokyo-fg/90 line-clamp-3 whitespace-pre-wrap leading-relaxed font-light">
                {note.content || <span className="italic opacity-50">Empty note...</span>}
            </p>

            <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2 text-xs text-tokyo-fg-dim">
                    <span>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>

                {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 overflow-hidden max-w-[120px]">
                        {note.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-tokyo-bg rounded-md text-tokyo-secondary truncate">
                                #{tag}
                            </span>
                        ))}
                        {note.tags.length > 2 && <span className="text-[10px] text-tokyo-fg-dim">+{note.tags.length - 2}</span>}
                    </div>
                )}
            </div>

            <button
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-tokyo-error/20 text-tokyo-fg hover:text-tokyo-error transition-all duration-200"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                }}
                title="Delete Note"
            >
                ×
            </button>
        </div>
    );
};
