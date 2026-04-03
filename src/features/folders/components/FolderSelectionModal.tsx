import React, { useState, useEffect } from 'react';
import type { Folder } from '../../../types';
import { storage } from '../../../shared/storage';

interface FolderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSelectedFolderIds: string[];
    onSave: (folderIds: string[]) => void;
}

export const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
    isOpen,
    onClose,
    initialSelectedFolderIds,
    onSave
}) => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [newFolderName, setNewFolderName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadFolders();
            setSelectedIds(initialSelectedFolderIds);
        }
    }, [isOpen, initialSelectedFolderIds]);

    const loadFolders = async () => {
        setIsLoading(true);
        const allFolders = await storage.getFolders();
        setFolders(allFolders);
        setIsLoading(false);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolder = await storage.createFolder(newFolderName.trim());
        setFolders(prev => [newFolder, ...prev]);
        setSelectedIds(prev => [...prev, newFolder.id]); // Auto-select new folder
        setNewFolderName('');
    };

    const handleToggle = (folderId: string) => {
        setSelectedIds(prev =>
            prev.includes(folderId)
                ? prev.filter(id => id !== folderId)
                : [...prev, folderId]
        );
    };

    const handleSave = () => {
        onSave(selectedIds);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-white/10 dark:bg-black/20 backdrop-blur-md animate-fade-in font-display">
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl w-full max-w-sm rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10 p-8 flex flex-col max-h-[70vh] animate-scale-in ring-1 ring-black/5 dark:ring-white/5">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Folders</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        <span className="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mb-8 pr-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400 font-medium">Loading spaces...</div>
                    ) : folders.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 opacity-60 flex flex-col items-center gap-3">
                            <span className="material-symbols-rounded text-4xl">folder_off</span>
                            <span className="text-sm font-bold">No folders found</span>
                        </div>
                    ) : (
                        folders.map(folder => (
                            <div
                                key={'item-' + folder.id}
                                onClick={() => handleToggle(folder.id)}
                                className="flex items-center gap-4 p-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all select-none group"
                            >
                                <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center transition-all border-2 ${selectedIds.includes(folder.id) ? 'border-indigo-500 bg-transparent' : 'border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600'}`}>
                                    {selectedIds.includes(folder.id) && <div className="w-3 h-3 bg-indigo-500 rounded-[3px] animate-scale-in" />}
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className={`font-bold text-[15px] ${selectedIds.includes(folder.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {folder.name}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create New & Actions */}
                <div className="flex flex-col gap-4">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="New folder name..."
                            className="w-full h-14 pl-5 pr-14 bg-slate-50 dark:bg-white/5 border-none rounded-2xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        />
                        <button
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim()}
                            className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center bg-white dark:bg-white/10 text-slate-900 dark:text-white rounded-xl shadow-sm hover:scale-105 active:scale-95 disabled:opacity-0 disabled:scale-75 transition-all duration-200 cursor-pointer"
                        >
                            <span className="material-symbols-rounded text-xl">add</span>
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-[15px] tracking-wide uppercase hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                    >
                        Save Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

