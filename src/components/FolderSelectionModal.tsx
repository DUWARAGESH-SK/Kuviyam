import React, { useState, useEffect } from 'react';
import type { Folder } from '../types';
import { storage } from '../utils/storage';

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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in font-display">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col max-h-[80vh] animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-extrabold text-[#1E293B] dark:text-white tracking-tight">Select Folders</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                        <span className="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-1 mb-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400">Loading...</div>
                    ) : folders.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 opacity-60 flex flex-col items-center">
                            <span className="material-symbols-rounded text-4xl mb-2">folder_off</span>
                            <span className="text-sm font-bold">No folders yet</span>
                        </div>
                    ) : (
                        folders.map(folder => (
                            <div
                                key={'item-' + folder.id}
                                onClick={() => handleToggle(folder.id)}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none group"
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all border ${selectedIds.includes(folder.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {selectedIds.includes(folder.id) && <span className="material-symbols-rounded text-white text-[14px] font-bold">check</span>}
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className={`font-bold text-sm ${selectedIds.includes(folder.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {folder.name}
                                    </span>
                                    {folder.parentId && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subfolder</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create New */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Create new folder..."
                        className="flex-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 text-slate-700 dark:text-white"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-rounded">add</span>
                    </button>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSave}
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm tracking-wide uppercase hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30"
                >
                    Done
                </button>
            </div>
        </div>
    );
};
