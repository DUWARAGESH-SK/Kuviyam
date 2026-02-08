import React, { useEffect } from 'react';
import type { Note } from '../types';

interface FocusModeProps {
    note: Note;
    onClose: () => void;
    onEdit: () => void;
    onToggleFavorite: () => void;
    isDark: boolean;
}

export const FocusMode: React.FC<FocusModeProps> = ({ note, onClose, onEdit, onToggleFavorite, isDark }) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl animate-fade-in font-display overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                            title="Close (Esc)"
                        >
                            <span className="material-symbols-rounded text-xl">close</span>
                        </button>
                        <h1 className="text-xl font-black text-white truncate">
                            {note.title || 'Untitled'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleFavorite}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${note.pinned
                                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                                }`}
                            title={note.pinned ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <span className="material-symbols-rounded text-xl">
                                {note.pinned ? 'star' : 'star_border'}
                            </span>
                        </button>
                        <button
                            onClick={onEdit}
                            className="px-4 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 transition-all active:scale-95 font-bold text-sm"
                        >
                            <span className="material-symbols-rounded text-[18px]">edit</span>
                            <span>Edit</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Metadata */}
                <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-[16px]">schedule</span>
                        <span>
                            {new Date(note.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>

                    {note.url && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-[16px]">link</span>
                            <a
                                href={note.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-indigo-400 transition-colors truncate max-w-xs"
                            >
                                {note.domain || note.url}
                            </a>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {note.tags.length > 0 && (
                    <div className="mb-8 flex flex-wrap gap-2">
                        {note.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-bold border border-indigo-500/30"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Note Content */}
                <div className="prose prose-invert prose-lg max-w-none">
                    <div className="text-slate-200 leading-relaxed whitespace-pre-wrap break-words text-lg">
                        {note.content}
                    </div>
                </div>

                {/* Empty State */}
                {!note.content && (
                    <div className="text-center py-16 text-slate-500">
                        <span className="material-symbols-rounded text-6xl mb-4 block opacity-30">description</span>
                        <p className="text-lg font-bold">No content yet</p>
                        <button
                            onClick={onEdit}
                            className="mt-4 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                        >
                            Start Writing
                        </button>
                    </div>
                )}
            </div>

            {/* Overlay Click to Close */}
            <div
                className="fixed inset-0 -z-10"
                onClick={onClose}
            />
        </div>
    );
};
