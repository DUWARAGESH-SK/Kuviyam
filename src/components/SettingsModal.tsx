import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { storage } from '../utils/storage';
import type { Note, Folder } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteAll: () => void;
}

type Tab = 'sync' | 'download' | 'websites' | 'delete';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onDeleteAll }) => {
    const [activeTab, setActiveTab] = useState<Tab>('sync');
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);

    // Download State
    const [selectedDownloadType, setSelectedDownloadType] = useState<'notes' | 'folders'>('notes');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Website List State
    const [linkedWebsites, setLinkedWebsites] = useState<{ domain: string, url: string, count: number, favicon?: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        const allNotes = await storage.getNotes();
        const allFolders = await storage.getFolders();
        setNotes(allNotes);
        setFolders(allFolders);

        // Process Websites
        const sites = new Map<string, { domain: string, url: string, count: number, favicon?: string }>();
        allNotes.forEach(note => {
            if (note.url && note.domain) {
                const existing = sites.get(note.domain) || { domain: note.domain, url: note.url, count: 0, favicon: note.favicon };
                existing.count++;
                sites.set(note.domain, existing);
            }
        });
        setLinkedWebsites(Array.from(sites.values()).sort((a, b) => a.domain.localeCompare(b.domain)));
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const zip = new JSZip();

        if (selectedDownloadType === 'notes') {
            const notesToDownload = selectedItemIds.length === 0
                ? notes
                : notes.filter(n => selectedItemIds.includes(n.id));

            if (notesToDownload.length === 1) {
                downloadSingleNote(notesToDownload[0]);
                setIsDownloading(false);
                return;
            }

            notesToDownload.forEach(note => {
                const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                const fileName = `${note.title || 'Untitled'}_${updatedTime}.txt`;
                const content = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;
                zip.file(fileName, content);
            });
        } else {
            // Folders - FIXED: Recursive file inclusion
            const foldersToDownload = selectedItemIds.length === 0
                ? folders
                : folders.filter(f => selectedItemIds.includes(f.id));

            for (const folder of foldersToDownload) {
                const folderNotes = notes.filter(n => n.folderIds?.includes(folder.id));
                const folderZip = zip.folder(folder.name);

                // CRITICAL FIX: Ensure all notes are added to the folder
                folderNotes.forEach(note => {
                    const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                    const fileName = `${note.title || 'Untitled'}_${updatedTime}.txt`;
                    const content = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;

                    // Use folderZip.file() to ensure files are added to the folder
                    if (folderZip) {
                        folderZip.file(fileName, content);
                    }
                });
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `antigravity_backup_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    const downloadSingleNote = (note: Note) => {
        const text = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${note.title || 'Untitled'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleSelection = (id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const targetIds = selectedDownloadType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedItemIds.length === targetIds.length) {
            setSelectedItemIds([]);
        } else {
            setSelectedItemIds(targetIds);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in font-display">
            <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#0F1115] rounded-3xl shadow-2xl overflow-hidden flex ring-1 ring-white/10 animate-scale-in">

                {/* LEFT PANEL - 30% Compact Options */}
                <div className="w-[30%] border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/30 flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Settings</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                            <span className="material-symbols-rounded text-slate-500 dark:text-white/50 text-[20px]">close</span>
                        </button>
                    </div>

                    {/* Options List */}
                    <div className="flex-1 p-3 space-y-1">
                        {[
                            { id: 'sync', icon: 'sync', label: 'Sync', danger: false },
                            { id: 'download', icon: 'download', label: 'Download', danger: false },
                            { id: 'websites', icon: 'language', label: 'Website List', danger: false },
                            { id: 'delete', icon: 'delete', label: 'Delete', danger: true }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === tab.id
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : tab.danger
                                        ? 'text-rose-500 hover:bg-rose-500/10'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <span className={`material-symbols-rounded text-[20px] ${tab.danger && activeTab !== tab.id ? 'text-rose-500' : ''}`}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANEL - 70% Expanded Content */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0F1115]">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                        {/* 1. SYNC TAB */}
                        {activeTab === 'sync' && (
                            <div className="space-y-6 max-w-2xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                        <span className="material-symbols-rounded text-3xl text-indigo-500">cloud_sync</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Sync Status</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Your data synchronization settings</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-rounded text-2xl text-indigo-500">check_circle</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Sync is Active</h4>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                                                Your notes are automatically synced to your local storage. All changes are saved in real-time.
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                                                <span className="material-symbols-rounded text-[14px]">schedule</span>
                                                <span>Last synced: Just now</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Coming Soon</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-sm">Cloud sync across devices will be available in a future update.</p>
                                </div>
                            </div>
                        )}

                        {/* 2. DOWNLOAD TAB */}
                        {activeTab === 'download' && (
                            <div className="space-y-6 h-full flex flex-col max-w-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                                        <span className="material-symbols-rounded text-3xl text-blue-500">download</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Download Your Data</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Export notes and folders as files</p>
                                    </div>
                                </div>

                                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => { setSelectedDownloadType('notes'); setSelectedItemIds([]); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'notes' ? 'bg-white dark:bg-[#0F1115] shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                    >
                                        Download Notes
                                    </button>
                                    <button
                                        onClick={() => { setSelectedDownloadType('folders'); setSelectedItemIds([]); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'folders' ? 'bg-white dark:bg-[#0F1115] shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                    >
                                        Download Folders
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 py-2 border-b border-slate-200 dark:border-white/10">
                                    <input
                                        type="checkbox"
                                        checked={selectedItemIds.length > 0 && selectedItemIds.length === (selectedDownloadType === 'notes' ? notes.length : folders.length)}
                                        onChange={toggleAll}
                                        className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                    />
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All</span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px]">
                                    {(selectedDownloadType === 'notes' ? notes : folders).map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                            <input
                                                type="checkbox"
                                                checked={selectedItemIds.includes(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                            />
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDownloadType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                {selectedDownloadType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                            </div>
                                        </div>
                                    ))}
                                    {(selectedDownloadType === 'notes' ? notes : folders).length === 0 && (
                                        <div className="text-center py-12 text-slate-400 opacity-60">Nothing to download</div>
                                    )}
                                </div>

                                <button
                                    onClick={handleDownload}
                                    disabled={selectedItemIds.length === 0 || isDownloading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isDownloading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">download</span>}
                                    {isDownloading ? 'Processing...' : `Download ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        )}

                        {/* 3. WEBSITES TAB - LINEAR TEXT LIST */}
                        {activeTab === 'websites' && (
                            <div className="space-y-6 max-w-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                                        <span className="material-symbols-rounded text-3xl text-teal-500">language</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Linked Websites</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">All websites connected to your notes</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {linkedWebsites.map((site, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 transition-all group">
                                            {/* Favicon */}
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0">
                                                {site.favicon ? (
                                                    <img src={site.favicon} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : (
                                                    <span className="material-symbols-rounded text-slate-400 text-[16px]">public</span>
                                                )}
                                            </div>

                                            {/* Website Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{site.domain}</h4>
                                                <p className="text-xs text-slate-400 truncate">{site.url}</p>
                                            </div>

                                            {/* Note Count Badge */}
                                            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{site.count} Note{site.count !== 1 ? 's' : ''}</span>
                                            </div>

                                            {/* Visit Button */}
                                            <a
                                                href={site.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                                            >
                                                Visit
                                                <span className="material-symbols-rounded text-[14px]">open_in_new</span>
                                            </a>
                                        </div>
                                    ))}
                                    {linkedWebsites.length === 0 && (
                                        <div className="text-center py-12 text-slate-400 opacity-60">No linked websites yet</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. DELETE TAB */}
                        {activeTab === 'delete' && (
                            <div className="space-y-6 flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                                    <span className="material-symbols-rounded text-4xl text-rose-500">delete_forever</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">Delete All Data?</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">This action cannot be undone. All notes, folders, and preferences will be permanently removed from your local storage.</p>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you absolutely sure you want to delete everything?')) {
                                            onDeleteAll();
                                            onClose();
                                        }
                                    }}
                                    className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                                >
                                    Yes, Delete Everything
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
