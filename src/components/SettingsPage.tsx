import React, { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { storage } from '../utils/storage';
import type { Note, Folder, AppSettings } from '../types';

interface SettingsPageProps {
    onDeleteAll?: () => void;
    onNavigateToNotes?: (domain: string) => void;
}

type Tab = 'general' | 'download' | 'delete' | 'websites';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDeleteAll, onNavigateToNotes }) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [stickMode, setStickMode] = useState<'global' | 'per-tab'>('global');

    // Download State
    const [selectedDownloadType, setSelectedDownloadType] = useState<'notes' | 'folders'>('notes');
    const [selectedDownloadIds, setSelectedDownloadIds] = useState<string[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Delete State
    const [selectedDeleteType, setSelectedDeleteType] = useState<'notes' | 'folders'>('notes');
    const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter State
    const [downloadFilter, setDownloadFilter] = useState<'alpha-asc' | 'alpha-desc' | 'recent' | 'oldest'>('alpha-asc');
    const [deleteFilter, setDeleteFilter] = useState<'alpha-asc' | 'alpha-desc' | 'recent' | 'oldest'>('alpha-asc');
    const [showDownloadFilter, setShowDownloadFilter] = useState(false);
    const [showDeleteFilter, setShowDeleteFilter] = useState(false);

    // Website List State
    const [linkedWebsites, setLinkedWebsites] = useState<{ domain: string, url: string, count: number, favicon?: string, lastUsed: number }[]>([]);
    const [websiteSort, setWebsiteSort] = useState<'recent' | 'oldest' | 'most-notes'>('recent');
    const [websiteFilterUnit, setWebsiteFilterUnit] = useState<'days' | 'months' | 'years'>('days');
    const [websiteFilterValue, setWebsiteFilterValue] = useState<number>(30);
    const [showWebsiteSort, setShowWebsiteSort] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const allNotes = await storage.getNotes();
        const allFolders = await storage.getFolders();
        const settings = await storage.getSettings();
        
        setNotes(allNotes);
        setFolders(allFolders);
        setStickMode(settings.stickMode);

        // Process Websites
        const sites = new Map<string, { domain: string, url: string, count: number, favicon?: string, lastUsed: number }>();
        allNotes.forEach(note => {
            if (note.url && note.domain) {
                const existing = sites.get(note.domain) || { domain: note.domain, url: note.url, count: 0, favicon: note.favicon, lastUsed: 0 };
                existing.count++;
                existing.lastUsed = Math.max(existing.lastUsed, note.updatedAt);
                sites.set(note.domain, existing);
            }
        });
        setLinkedWebsites(Array.from(sites.values()).sort((a, b) => a.domain.localeCompare(b.domain)));
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const zip = new JSZip();

        if (selectedDownloadType === 'notes') {
            const notesToDownload = selectedDownloadIds.length === 0
                ? notes
                : notes.filter(n => selectedDownloadIds.includes(n.id));

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
            const foldersToDownload = selectedDownloadIds.length === 0
                ? folders
                : folders.filter(f => selectedDownloadIds.includes(f.id));

            for (const folder of foldersToDownload) {
                const folderNotes = notes.filter(n => n.folderIds?.includes(folder.id));
                const folderZip = zip.folder(folder.name);

                folderNotes.forEach(note => {
                    const updatedTime = new Date(note.updatedAt).toISOString().replace(/[:.]/g, '-');
                    const fileName = `${note.title || 'Untitled'}_${updatedTime}.txt`;
                    const content = `Title: ${note.title}\nURL: ${note.url || ''}\nDomain: ${note.domain || ''}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;

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

    const handleDelete = async () => {
        const itemCount = selectedDeleteIds.length;
        const itemType = selectedDeleteType === 'notes' ? 'note' : 'folder';

        if (!confirm(`Are you sure you want to delete ${itemCount} ${itemType}${itemCount !== 1 ? 's' : ''}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);

        if (selectedDeleteType === 'notes') {
            for (const id of selectedDeleteIds) {
                await storage.deleteNote(id);
            }
        } else {
            for (const id of selectedDeleteIds) {
                await storage.deleteFolder(id);
            }
        }

        await loadData();
        setSelectedDeleteIds([]);
        setIsDeleting(false);
    };

    const toggleDownloadSelection = (id: string) => {
        setSelectedDownloadIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDownloadAll = () => {
        const targetIds = selectedDownloadType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedDownloadIds.length === targetIds.length) {
            setSelectedDownloadIds([]);
        } else {
            setSelectedDownloadIds(targetIds);
        }
    };

    const toggleDeleteSelection = (id: string) => {
        setSelectedDeleteIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDeleteAll = () => {
        const targetIds = selectedDeleteType === 'notes' ? notes.map(n => n.id) : folders.map(f => f.id);
        if (selectedDeleteIds.length === targetIds.length) {
            setSelectedDeleteIds([]);
        } else {
            setSelectedDeleteIds(targetIds);
        }
    };

    // Apply filters
    const applyFilter = (items: (Note | Folder)[], filter: string, type: 'notes' | 'folders') => {
        const sorted = [...items];
        if (filter === 'alpha-asc') {
            sorted.sort((a, b) => {
                const nameA = type === 'notes' ? (a as Note).title || 'Untitled' : (a as Folder).name;
                const nameB = type === 'notes' ? (b as Note).title || 'Untitled' : (b as Folder).name;
                return nameA.localeCompare(nameB);
            });
        } else if (filter === 'alpha-desc') {
            sorted.sort((a, b) => {
                const nameA = type === 'notes' ? (a as Note).title || 'Untitled' : (a as Folder).name;
                const nameB = type === 'notes' ? (b as Note).title || 'Untitled' : (b as Folder).name;
                return nameB.localeCompare(nameA);
            });
        } else if (filter === 'recent') {
            sorted.sort((a, b) => {
                const timeA = type === 'notes' ? (a as Note).updatedAt : (a as Folder).createdAt;
                const timeB = type === 'notes' ? (b as Note).updatedAt : (b as Folder).createdAt;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
        } else if (filter === 'oldest') {
            sorted.sort((a, b) => {
                const timeA = type === 'notes' ? (a as Note).updatedAt : (a as Folder).createdAt;
                const timeB = type === 'notes' ? (b as Note).updatedAt : (b as Folder).createdAt;
                return new Date(timeA).getTime() - new Date(timeB).getTime();
            });
        }
        return sorted;
    };

    const downloadItems = applyFilter(
        selectedDownloadType === 'notes' ? notes : folders,
        downloadFilter,
        selectedDownloadType
    );
    const deleteItems = applyFilter(
        selectedDeleteType === 'notes' ? notes : folders,
        deleteFilter,
        selectedDeleteType
    );

    const filteredWebsites = useMemo(() => {
        const now = Date.now();
        let cutoff = now;
        if (websiteFilterUnit === 'days') cutoff -= websiteFilterValue * 24 * 60 * 60 * 1000;
        else if (websiteFilterUnit === 'months') cutoff -= websiteFilterValue * 30 * 24 * 60 * 60 * 1000;
        else if (websiteFilterUnit === 'years') cutoff -= websiteFilterValue * 365 * 24 * 60 * 60 * 1000;

        let res = linkedWebsites.filter(site => site.lastUsed >= cutoff);

        if (websiteSort === 'recent') res.sort((a, b) => b.lastUsed - a.lastUsed);
        else if (websiteSort === 'oldest') res.sort((a, b) => a.lastUsed - b.lastUsed);
        else if (websiteSort === 'most-notes') res.sort((a, b) => b.count - a.count);

        return res;
    }, [linkedWebsites, websiteSort, websiteFilterUnit, websiteFilterValue]);

    const getRelativeTime = (timestamp: number) => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const diff = timestamp - Date.now();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        if (Math.abs(days) < 1) {
            const hours = Math.round(diff / (1000 * 60 * 60));
            if (Math.abs(hours) < 1) {
                const minutes = Math.round(diff / (1000 * 60));
                return rtf.format(minutes, 'minute');
            }
            return rtf.format(hours, 'hour');
        }
        if (Math.abs(days) >= 30) {
            return rtf.format(Math.round(days / 30), 'month');
        }
        return rtf.format(days, 'day');
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display">
            {/* TOP HEADER & TABS */}
            <div className="px-6 pt-10 pb-4 border-b border-slate-200 dark:border-white/5 shadow-sm z-10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                    <img src="/logo.png" alt="Kuviyam" className="w-10 h-10 rounded-xl shadow-sm border border-slate-200/50 dark:border-white/10 object-cover shrink-0" />
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight pt-1">Settings</h2>
                </div>

                {/* Horizontal Tabs List */}
                <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-2">
                    {[
                        { id: 'general', icon: 'settings', label: 'General' },
                        { id: 'download', icon: 'download', label: 'Download' },
                        { id: 'delete', icon: 'delete', label: 'Delete' },
                        { id: 'websites', icon: 'language', label: 'Websites' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm whitespace-nowrap shrink-0 ${activeTab === tab.id
                                ? 'bg-indigo-500 text-white shadow-md'
                                : tab.id === 'delete'
                                    ? 'text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20'
                                    : 'text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10'
                                }`}
                        >
                            <span className="material-symbols-rounded text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT PANEL */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
                <div className="p-5 max-w-4xl mx-auto w-full">

                    {/* 1. GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            
                            {/* Panel Behavior Section */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded text-xl text-indigo-500">picture_in_picture</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Panel Behavior</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    <button 
                                        onClick={async () => {
                                            setStickMode('global');
                                            await storage.saveSettings({ stickMode: 'global' });
                                        }}
                                        className={`px-5 py-4 rounded-2xl border text-left transition-all ${stickMode === 'global' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${stickMode === 'global' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {stickMode === 'global' && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-base font-bold mb-1 ${stickMode === 'global' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Global Stick (Stick Anywhere)</h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs">The panel follows you everywhere. If you open it on one tab, it instantly mirrors exactly on all other tabs.</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={async () => {
                                            setStickMode('per-tab');
                                            await storage.saveSettings({ stickMode: 'per-tab' });
                                        }}
                                        className={`px-5 py-4 rounded-2xl border text-left transition-all ${stickMode === 'per-tab' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${stickMode === 'per-tab' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {stickMode === 'per-tab' && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-base font-bold mb-1 ${stickMode === 'per-tab' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>Local Stick (Per Tab)</h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs">The panel acts independently. Opening it in one tab won't affect it in others.</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Sync Status Section */}
                            <div className="mt-8 border-t border-slate-100 dark:border-white/5 pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded text-xl text-slate-500 dark:text-slate-400">cloud_sync</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Sync Status</h3>
                                </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="px-5 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 relative">
                                            <span className="absolute w-full h-full bg-indigo-400 rounded-full animate-ping opacity-20"></span>
                                            <span className="material-symbols-rounded text-lg text-indigo-600 dark:text-indigo-400 z-10">check_circle</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-base font-bold text-slate-800 dark:text-white truncate">Sync Active</h4>
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                                    <span className="material-symbols-rounded text-[12px]">schedule</span>
                                                    Just now
                                                </span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-xs truncate">
                                                Auto-sync enabled to local storage.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-rounded text-lg text-slate-500 dark:text-slate-400">devices</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-base font-bold text-slate-800 dark:text-white truncate">Cross-Device</h4>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Soon</span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-500 text-xs truncate">
                                                Available in a future update.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    )}

                    {/* 2. DOWNLOAD TAB */}
                    {activeTab === 'download' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-xl text-blue-500">download</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">Download Data</h3>
                            </div>

                            {downloadItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-700 mb-4">inbox</span>
                                    <h4 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">No content to download yet</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-sm">Create some {selectedDownloadType} first to download them</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                        <button
                                            onClick={() => { setSelectedDownloadType('notes'); setSelectedDownloadIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'notes' ? 'bg-white dark:bg-background-dark shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Download Notes
                                        </button>
                                        <button
                                            onClick={() => { setSelectedDownloadType('folders'); setSelectedDownloadIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDownloadType === 'folders' ? 'bg-white dark:bg-background-dark shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Download Folders
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDownloadIds.length > 0 && selectedDownloadIds.length === downloadItems.length}
                                                onChange={toggleDownloadAll}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                            />
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All ({downloadItems.length})</span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDownloadFilter(!showDownloadFilter)}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-slate-600 dark:text-slate-400 text-[20px]">filter_list</span>
                                            </button>
                                            {showDownloadFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 w-48 z-50">
                                                    {[
                                                        { id: 'alpha-asc', label: 'A → Z', icon: 'sort_by_alpha' },
                                                        { id: 'alpha-desc', label: 'Z → A', icon: 'sort_by_alpha' },
                                                        { id: 'recent', label: 'Most Recent', icon: 'schedule' },
                                                        { id: 'oldest', label: 'Oldest First', icon: 'history' }
                                                    ].map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => { setDownloadFilter(option.id as any); setShowDownloadFilter(false); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${downloadFilter === option.id ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">{option.icon}</span>
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px] max-h-[400px]">
                                        {downloadItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDownloadIds.includes(item.id)}
                                                    onChange={() => toggleDownloadSelection(item.id)}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500/40"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDownloadType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                    {selectedDownloadType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleDownload}
                                        disabled={selectedDownloadIds.length === 0 || isDownloading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">download</span>}
                                        {isDownloading ? 'Processing...' : `Download ${selectedDownloadIds.length} Item${selectedDownloadIds.length !== 1 ? 's' : ''}`}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 3. DELETE TAB */}
                    {activeTab === 'delete' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-rounded text-xl text-rose-500">delete</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">Delete Data</h3>
                            </div>

                            {deleteItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-700 mb-4">shield</span>
                                    <h4 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">Nothing to delete</h4>
                                    <p className="text-slate-500 dark:text-slate-500 text-sm">Your {selectedDeleteType} are safe</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                                        <button
                                            onClick={() => { setSelectedDeleteType('notes'); setSelectedDeleteIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDeleteType === 'notes' ? 'bg-white dark:bg-background-dark shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Delete Notes
                                        </button>
                                        <button
                                            onClick={() => { setSelectedDeleteType('folders'); setSelectedDeleteIds([]); }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedDeleteType === 'folders' ? 'bg-white dark:bg-background-dark shadow text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            Delete Folders
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDeleteIds.length > 0 && selectedDeleteIds.length === deleteItems.length}
                                                onChange={toggleDeleteAll}
                                                className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-rose-600 focus:ring-rose-500/40"
                                            />
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Select All ({deleteItems.length})</span>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDeleteFilter(!showDeleteFilter)}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-slate-600 dark:text-slate-400 text-[20px]">filter_list</span>
                                            </button>
                                            {showDeleteFilter && (
                                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 w-48 z-50">
                                                    {[
                                                        { id: 'alpha-asc', label: 'A → Z', icon: 'sort_by_alpha' },
                                                        { id: 'alpha-desc', label: 'Z → A', icon: 'sort_by_alpha' },
                                                        { id: 'recent', label: 'Most Recent', icon: 'schedule' },
                                                        { id: 'oldest', label: 'Oldest First', icon: 'history' }
                                                    ].map(option => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => { setDeleteFilter(option.id as any); setShowDeleteFilter(false); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${deleteFilter === option.id ? 'bg-rose-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                        >
                                                            <span className="material-symbols-rounded text-[16px]">{option.icon}</span>
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-[200px] max-h-[400px]">
                                        {deleteItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDeleteIds.includes(item.id)}
                                                    onChange={() => toggleDeleteSelection(item.id)}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 bg-transparent text-rose-600 focus:ring-rose-500/40"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{selectedDeleteType === 'notes' ? (item as Note).title || 'Untitled' : (item as Folder).name}</div>
                                                    {selectedDeleteType === 'notes' && <div className="text-xs text-slate-400 truncate">{(item as Note).content.substring(0, 40)}...</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleDelete}
                                        disabled={selectedDeleteIds.length === 0 || isDeleting}
                                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? <span className="material-symbols-rounded animate-spin">progress_activity</span> : <span className="material-symbols-rounded">delete</span>}
                                        {isDeleting ? 'Deleting...' : `Delete ${selectedDeleteIds.length} Item${selectedDeleteIds.length !== 1 ? 's' : ''}`}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 4. WEBSITES TAB */}
                    {activeTab === 'websites' && (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded text-xl text-teal-500">language</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Linked Websites</h3>
                                </div>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowWebsiteSort(!showWebsiteSort)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm font-bold text-slate-600 dark:text-slate-300"
                                    >
                                        <span className="material-symbols-rounded text-[18px]">sort</span>
                                        {websiteSort === 'recent' ? 'Recent' : websiteSort === 'oldest' ? 'Oldest' : 'Most Notes'}
                                    </button>
                                    {showWebsiteSort && (
                                        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 p-2 w-40 z-50">
                                            <button onClick={() => { setWebsiteSort('recent'); setShowWebsiteSort(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${websiteSort === 'recent' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>Recent</button>
                                            <button onClick={() => { setWebsiteSort('oldest'); setShowWebsiteSort(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${websiteSort === 'oldest' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>Oldest</button>
                                            <button onClick={() => { setWebsiteSort('most-notes'); setShowWebsiteSort(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${websiteSort === 'most-notes' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>Most Notes</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Filter Control */}
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 shrink-0">Filter:</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="99"
                                    value={websiteFilterValue || ''} 
                                    onChange={(e) => setWebsiteFilterValue(parseInt(e.target.value) || 0)}
                                    className="w-16 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-center appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <select 
                                    value={websiteFilterUnit} 
                                    onChange={(e) => setWebsiteFilterUnit(e.target.value as 'days' | 'months' | 'years')}
                                    className="bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                                >
                                    <option value="days">Days</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[300px]">
                                {filteredWebsites.map((site, idx) => (
                                    <div key={idx} className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md transition-all group">
                                        
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-black/40 flex items-center justify-center border border-slate-100 dark:border-white/10 shrink-0 shadow-sm relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                                {site.favicon ? (
                                                    <img src={site.favicon} alt="" className="w-6 h-6 object-contain z-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                ) : (
                                                    <span className="material-symbols-rounded text-slate-400 text-[20px] z-10">public</span>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base truncate mb-0.5" title={site.domain}>{site.domain}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5" title={site.url}>
                                                    <span className="material-symbols-rounded text-[12px] opacity-70">history</span>
                                                    Last used {getRelativeTime(site.lastUsed)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <button 
                                                onClick={() => onNavigateToNotes && onNavigateToNotes(site.domain)}
                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-black transition-colors active:scale-95 flex items-center gap-2 border border-indigo-100 dark:border-transparent"
                                            >
                                                <span className="material-symbols-rounded text-[16px]">description</span>
                                                {site.count} Note{site.count !== 1 ? 's' : ''}
                                            </button>

                                            <a
                                                href={site.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95"
                                                title="Visit Site"
                                            >
                                                <span className="material-symbols-rounded text-[16px]">open_in_new</span>
                                            </a>
                                        </div>

                                    </div>
                                ))}
                                {filteredWebsites.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <span className="material-symbols-rounded text-3xl text-slate-300 dark:text-slate-600">search_off</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-1">No websites found</h4>
                                        <p className="text-sm text-slate-500 max-w-xs mx-auto">Try adjusting your time range or saving some notes first.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
