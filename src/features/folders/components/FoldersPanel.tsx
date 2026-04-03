import { useState, useEffect } from 'react';
import type { Folder, Note } from '../../../types';
import { storage } from '../../../shared/storage';
import { AddNotesToFolderModal } from '@/features/folders/components/AddNotesToFolderModal';
import { FocusMode } from '@/features/notes/components/FocusMode';

export interface FoldersPanelProps {
    onEditNote?: (note: Note) => void;
}

export function FoldersPanel({ onEditNote }: FoldersPanelProps) {
    const [folders, setFolders] = useState<Folder[]>([]); // Current level folders
    const [notes, setNotes] = useState<Note[]>([]); // Current level notes
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isAddNotesModalOpen, setIsAddNotesModalOpen] = useState(false);
    const [focusedNote, setFocusedNote] = useState<Note | null>(null);

    useEffect(() => {
        loadContent();
    }, [currentFolderId]);

    const loadContent = async () => {
        if (currentFolderId) {
            // Inside a folder
            const subfolders = await storage.getSubfolders(currentFolderId);
            const folderNotes = await storage.getNotesInFolder(currentFolderId);
            const allFolders = await storage.getFolders();
            const current = allFolders.find(f => f.id === currentFolderId) || null;

            setFolders(subfolders);
            setNotes(folderNotes);
            setCurrentFolder(current);
        } else {
            // Root
            const rootFolders = await storage.getSubfolders(undefined as any); // Or handle root fetching logic
            // Ideally getSubfolders(undefined) should return root folders
            const all = await storage.getFolders();
            // Filter root folders manually if getSubfolders logic isn't exact for undefined
            setFolders(all.filter(f => !f.parentId));
            setNotes([]); // No notes at root level for now, or maybe unassigned notes?
            setCurrentFolder(null);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await storage.createFolder(newFolderName.trim(), currentFolderId || undefined);
        setNewFolderName('');
        setIsCreateModalOpen(false);
        await loadContent();
    };

    const handleDeleteFolder = async (id: string) => {
        if (confirm('Delete this folder?')) {
            await storage.deleteFolder(id);
            await loadContent();
        }
    };

    const handleRemoveNoteFromFolder = async (note: Note) => {
        if (!currentFolderId) return;
        if (confirm('Remove note from this folder?')) {
            const newFolderIds = note.folderIds?.filter(id => id !== currentFolderId) || [];
            const updatedNote = { ...note, folderIds: newFolderIds };
            await storage.saveNote(updatedNote);
            await loadContent();
        }
        await loadContent();
    };

    const handleToggleFavorite = async (note: Note) => {
        const updatedNote = { ...note, pinned: !note.pinned };
        await storage.saveNote(updatedNote);
        if (focusedNote?.id === note.id) {
            setFocusedNote(updatedNote);
        }
        await loadContent();
    };

    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full h-full flex flex-col bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative">
            <main className="relative z-10 px-6 pt-12 pb-32 flex-1 overflow-y-auto">
                {/* Header & Navigation */}
                <header className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {currentFolderId && (
                                <button
                                    onClick={() => setCurrentFolderId(null)} // Go to root for simplicity, or implement stack
                                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-rounded">arrow_back</span>
                                </button>
                            )}
                            <div className="flex items-center gap-3">
                                {!currentFolder && <img src="/logo.png" alt="Kuviyam" className="w-12 h-12 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 object-cover" />}
                                <h1 className="text-3xl font-extrabold text-[#1E293B] dark:text-white tracking-tight title-embossed">
                                    {currentFolder ? currentFolder.name : 'Folders'}
                                </h1>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {currentFolderId && (
                                <button
                                    onClick={() => setIsAddNotesModalOpen(true)}
                                    className="px-4 h-10 rounded-full bg-indigo-500 text-white shadow-sm flex items-center gap-2 active:scale-95 transition-transform cursor-pointer font-bold text-sm"
                                    title="Add notes to this folder"
                                >
                                    <span className="material-symbols-rounded text-[18px]">note_add</span>
                                    <span>Add Notes</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-primary text-slate-900 shadow-sm flex items-center justify-center active:scale-95 transition-transform px-0 cursor-pointer"
                                title="Create subfolder"
                            >
                                <span className="material-symbols-rounded text-xl">add</span>
                            </button>
                        </div>
                    </div>
                    {/* Breadcrumbs (Simple) */}
                    {currentFolderId && (
                        <div className="text-sm text-slate-400 font-bold px-1 mb-4 flex items-center gap-2">
                            <span onClick={() => setCurrentFolderId(null)} className="cursor-pointer hover:text-primary">Folders</span>
                            <span className="material-symbols-rounded text-xs">chevron_right</span>
                            <span className="text-slate-600 dark:text-slate-200">{currentFolder?.name}</span>
                        </div>
                    )}
                </header>

                {/* Subfolders Grid */}
                {filteredFolders.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Folders</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {filteredFolders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => setCurrentFolderId(folder.id)}
                                    className="aspect-square bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-50 dark:border-slate-700/50 flex flex-col items-center justify-center p-3 cursor-pointer hover:shadow-md transition-all group relative"
                                >
                                    <span className="material-symbols-rounded text-4xl text-amber-400 mb-2">folder</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 text-center w-full truncate px-1">{folder.name}</span>
                                    {folder.itemCount > 0 && (
                                        <span className="absolute top-2 right-2 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-slate-500 dark:text-slate-400">{folder.itemCount}</span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(folder.id);
                                        }}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                                    >
                                        <span className="material-symbols-rounded text-lg">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes List */}
                {currentFolderId && (
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Notes</h3>
                        {notes.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                No notes in this folder.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {notes.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => setFocusedNote(note)}
                                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-50 dark:border-slate-700/50 flex items-center justify-between group cursor-pointer hover:shadow-md hover:border-indigo-500/30 transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate pr-4">{note.title || 'Untitled'}</h4>
                                            <p className="text-xs text-slate-400 truncate pr-4">{note.content}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {note.pinned && (
                                                <span className="material-symbols-rounded text-amber-400 text-[18px]">star</span>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveNoteFromFolder(note);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                                                title="Remove from folder"
                                            >
                                                <span className="material-symbols-rounded">playlist_remove</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!currentFolderId && filteredFolders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <span className="material-symbols-rounded text-6xl opacity-20 mb-4">create_new_folder</span>
                        <p>No folders yet. Create one!</p>
                    </div>
                )}

            </main>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                            {currentFolderId ? `New Subfolder in ${currentFolder?.name}` : 'New Root Folder'}
                        </h3>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Folder Name"
                            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-6 focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-white"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderName.trim()}
                                className="px-4 py-2 rounded-xl bg-primary text-slate-900 font-bold text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Notes to Folder Modal */}
            {currentFolderId && currentFolder && (
                <AddNotesToFolderModal
                    isOpen={isAddNotesModalOpen}
                    onClose={() => setIsAddNotesModalOpen(false)}
                    folderId={currentFolderId}
                    folderName={currentFolder.name}
                    onNotesAdded={loadContent}
                />
            )}

            {/* Focus Mode Overlay */}
            {focusedNote && (
                <FocusMode
                    note={focusedNote}
                    onClose={() => setFocusedNote(null)}
                    onEdit={() => {
                        onEditNote?.(focusedNote);
                        setFocusedNote(null);
                    }}
                    onToggleFavorite={() => handleToggleFavorite(focusedNote)}
                    isDark={true} // Default to dark for focus mode as per spec
                />
            )}
        </div>
    );
}
