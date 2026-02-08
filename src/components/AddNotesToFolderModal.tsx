import React, { useState, useEffect } from 'react';
import type { Note } from '../types';
import { storage } from '../utils/storage';

interface AddNotesToFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    folderName: string;
    onNotesAdded: () => void;
}

export const AddNotesToFolderModal: React.FC<AddNotesToFolderModalProps> = ({
    isOpen,
    onClose,
    folderId,
    folderName,
    onNotesAdded
}) => {
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadNotes();
        }
    }, [isOpen, folderId]);

    const loadNotes = async () => {
        setIsLoading(true);
        const notes = await storage.getNotes();
        // Filter out notes already in this folder
        const availableNotes = notes.filter(note => !note.folderIds?.includes(folderId));
        setAllNotes(availableNotes);
        setSelectedNoteIds([]);
        setSearchQuery('');
        setIsLoading(false);
    };

    const handleToggleNote = (noteId: string) => {
        setSelectedNoteIds(prev =>
            prev.includes(noteId)
                ? prev.filter(id => id !== noteId)
                : [...prev, noteId]
        );
    };

    const handleSelectAll = () => {
        const filteredNotes = getFilteredNotes();
        if (selectedNoteIds.length === filteredNotes.length) {
            setSelectedNoteIds([]);
        } else {
            setSelectedNoteIds(filteredNotes.map(n => n.id));
        }
    };

    const handleAddNotes = async () => {
        if (selectedNoteIds.length === 0) return;

        setIsAdding(true);

        for (const noteId of selectedNoteIds) {
            const note = allNotes.find(n => n.id === noteId);
            if (note) {
                const updatedFolderIds = [...(note.folderIds || []), folderId];
                await storage.saveNote({ ...note, folderIds: updatedFolderIds });
            }
        }

        setIsAdding(false);
        onNotesAdded();
        onClose();
    };

    const getFilteredNotes = () => {
        return allNotes.filter(note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    if (!isOpen) return null;

    const filteredNotes = getFilteredNotes();

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-white/10 dark:bg-black/20 backdrop-blur-md animate-fade-in font-display">
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl w-full max-w-lg rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10 p-8 flex flex-col max-h-[80vh] animate-scale-in ring-1 ring-black/5 dark:ring-white/5">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Add Notes</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">to "{folderName}"</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        <span className="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                    />
                </div>

                {/* Select All */}
                {filteredNotes.length > 0 && (
                    <div className="flex items-center gap-3 py-2 mb-2 border-b border-slate-200 dark:border-white/10">
                        <input
                            type="checkbox"
                            checked={selectedNoteIds.length > 0 && selectedNoteIds.length === filteredNotes.length}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                        />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            Select All ({filteredNotes.length})
                        </span>
                    </div>
                )}

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-6 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-400 font-medium">Loading notes...</div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 opacity-60 flex flex-col items-center gap-3">
                            <span className="material-symbols-rounded text-4xl">inbox</span>
                            <span className="text-sm font-bold">
                                {searchQuery ? 'No notes found' : 'All notes are already in this folder'}
                            </span>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => handleToggleNote(note.id)}
                                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedNoteIds.includes(note.id)}
                                    onChange={() => { }}
                                    className="w-5 h-5 mt-0.5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40 pointer-events-none"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">
                                        {note.title || 'Untitled'}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate mt-1">
                                        {note.content.substring(0, 60)}...
                                    </div>
                                    {note.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                            {note.tags.slice(0, 3).map((tag, idx) => (
                                                <span key={idx} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold">
                                                    {tag}
                                                </span>
                                            ))}
                                            {note.tags.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">
                                                    +{note.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleAddNotes}
                    disabled={selectedNoteIds.length === 0 || isAdding}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-[15px] tracking-wide uppercase hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isAdding ? (
                        <>
                            <span className="material-symbols-rounded animate-spin">progress_activity</span>
                            Adding...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-rounded">add</span>
                            Add {selectedNoteIds.length} Note{selectedNoteIds.length !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
