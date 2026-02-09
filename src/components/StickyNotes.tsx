import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import { FolderSelectionModal } from './FolderSelectionModal';
import { SettingsModal } from './SettingsModal';
import type { PanelLayout, NoteDraft } from '../types';

interface StickyNotesProps {
    onClose: () => void;
}

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | null;

const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>({
        x: 50,
        y: 50,
        width: 480,
        height: 750,
        isMinimized: false,
        isOpen: true
    });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDark, setIsDark] = useState(false); // Match light mode in image
    const [isPinned, setIsPinned] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

    const [isDragging, setIsDragging] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);

    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, lx: 0, ly: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);

        const loadDraft = () => {
            chrome.storage.local.get(['panelDraft']).then((res) => {
                const draft = res.panelDraft as any;
                if (draft) {
                    setTitle(draft.title || '');
                    setContent(draft.content || '');
                    setTagsInput(draft.tags ? draft.tags.join(', ') : '');
                    setIsPinned(draft.pinned || false);
                    setSelectedFolderIds(draft.folderIds || []);
                }
            });
        };

        loadDraft();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.panelDraft) {
                const draft = changes.panelDraft.newValue as NoteDraft;
                if (draft) {
                    setTitle(draft.title || '');
                    setContent(draft.content || '');
                    setTagsInput(draft.tags ? draft.tags.join(', ') : '');
                    setIsPinned(draft.pinned || false);
                    setSelectedFolderIds(draft.folderIds || []);
                }
            }
            if (changes.panelLayout) {
                setLayout(changes.panelLayout.newValue as PanelLayout);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        const draft = {
            title,
            content,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            pinned: isPinned,
            folderIds: selectedFolderIds,
            updatedAt: Date.now()
        };
        chrome.storage.local.set({ panelDraft: draft });
    }, [title, content, tagsInput, isPinned, selectedFolderIds]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (resizeDir) {
                let newW = layout.width;
                let newH = layout.height;
                let newX = layout.x;
                let newY = layout.y;

                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;

                if (resizeDir.includes('e')) newW = Math.max(300, resizeStart.current.w + dx);
                if (resizeDir.includes('w')) {
                    const potentialW = resizeStart.current.w - dx;
                    if (potentialW > 300) {
                        newW = potentialW;
                        newX = resizeStart.current.lx + dx;
                    }
                }
                if (resizeDir.includes('s')) newH = Math.max(400, resizeStart.current.h + dy);
                if (resizeDir.includes('n')) {
                    const potentialH = resizeStart.current.h - dy;
                    if (potentialH > 400) {
                        newH = potentialH;
                        newY = resizeStart.current.ly + dy;
                    }
                }
                setLayout({ ...layout, x: newX, y: newY, width: newW, height: newH });
            }
        };

        const handleMouseUp = () => {
            if (isDragging || resizeDir) {
                setIsDragging(false);
                setResizeDir(null);
                storage.savePanelLayout(layout);
            }
        };

        if (isDragging || resizeDir) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeDir, layout]);

    const handleDragDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - layout.x, y: e.clientY - layout.y };
    };

    const handleResizeDown = (dir: ResizeDirection) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setResizeDir(dir);
        resizeStart.current = {
            x: e.clientX, y: e.clientY,
            w: layout.width, h: layout.height,
            lx: layout.x, ly: layout.y
        };
    };

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            pinned: isPinned,
            domain: window.location.hostname,
            url: window.location.href,
            favicon: document.querySelector("link[rel~='icon']") ? (document.querySelector("link[rel~='icon']") as HTMLLinkElement).href : `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
            folderIds: selectedFolderIds
        };
        await storage.createNote(draft);
        displayStatus('Note Saved!');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    const domain = window.location.hostname || 'chat.deepseek.com';

    return (
        <div
            className={`font-display flex flex-col relative transition-all duration-300 ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[2147483647]' : ''}`}
            style={!isFocusMode ? {
                position: 'fixed',
                left: `${layout.x}px`, top: `${layout.y}px`,
                width: `${layout.width}px`, height: `${layout.height}px`,
                minWidth: '380px',
                borderRadius: '32px',
                boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.2)',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)',
                color: isDark ? 'white' : '#1e293b'
            } : {
                width: '100vw', height: '100vh',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                pointerEvents: 'auto', zIndex: 2147483647,
                color: isDark ? 'white' : '#1e293b'
            }}
        >
            {/* Header */}
            <header
                onMouseDown={handleDragDown}
                className="px-8 py-6 flex items-center justify-between cursor-move select-none border-b border-slate-50 dark:border-white/5"
            >
                <div className="flex items-center gap-6 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                        <span className="material-symbols-rounded text-slate-400 text-[24px] flex-shrink-0">chevron_left</span>
                    </button>
                    <span className="text-[18px] font-extrabold text-[#94A3B8] dark:text-white/40 tracking-wider whitespace-nowrap">EDIT NOTE</span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isFocusMode ? 'close_fullscreen' : 'expand_content'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#4F46E5] text-white px-9 py-3 rounded-full font-bold text-[16px] hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_10px_30px_-5px_rgba(79,70,229,0.4)] ml-2 flex-shrink-0"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Main Scroll Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className={`flex-1 overflow-y-auto px-10 pt-10 pb-32 custom-scrollbar ${isFocusMode ? 'max-w-4xl mx-auto w-full' : ''}`}>

                    {/* Meta Row: Date and Action Pill */}
                    <div className="flex items-center justify-between mb-10">
                        <span className="text-[#94A3B8] dark:text-white/30 text-[14px] font-bold tracking-widest">{formattedDate}</span>

                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1.5 rounded-full border border-slate-100 dark:border-white/5">
                            <button onClick={() => setIsPinned(!isPinned)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isPinned ? 'text-rose-500' : 'text-[#94A3B8] hover:text-slate-600 dark:hover:text-white'}`}>
                                <span className={`material-symbols-rounded text-[22px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                            <button onClick={() => setIsFolderModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-rounded text-[22px]">create_new_folder</span>
                            </button>
                            <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-rounded text-[22px]">more_vert</span>
                            </button>
                        </div>
                    </div>

                    {/* Linked Badge Pill */}
                    <div className="mb-12">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#EEF2FF] dark:bg-indigo-500/5 border border-[#E0E7FF] dark:border-indigo-500/10 rounded-2xl text-[#4F46E5] dark:text-indigo-400 font-bold text-[14px]">
                            <span className="material-symbols-rounded text-[20px]">language</span>
                            <span>Linked to {domain}</span>
                            <span className="material-symbols-rounded text-[18px] ml-1 opacity-50">open_in_new</span>
                        </div>
                    </div>

                    {/* Content Editor (Large font) */}
                    <textarea
                        ref={textareaRef}
                        className="w-full bg-transparent text-[58px] font-black text-[#1E293B] dark:text-white mb-4 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-white/5 leading-[1.05] tracking-tighter p-0 resize-none font-display overflow-hidden"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Secondary Title Area (# Tags) */}
                    <div className="flex items-start gap-3 mb-8 group">
                        <span className="material-symbols-rounded text-slate-300 dark:text-white/20 text-[22px] mt-1">tag</span>
                        <textarea
                            rows={1}
                            className="flex-1 bg-transparent text-[20px] font-bold text-[#94A3B8] dark:text-white/30 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 resize-none font-display overflow-hidden"
                            placeholder="Actualize Tags"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                    </div>
                </div>
            </main>

            {/* Resize Handles (Small Triangles/Dots) */}
            {!isFocusMode && (
                <>
                    {/* NW Handle */}
                    <div onMouseDown={handleResizeDown('nw')} className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-[60] group flex items-start justify-start p-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* NE Handle */}
                    <div onMouseDown={handleResizeDown('ne')} className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-[60] group flex items-start justify-end p-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* SW Handle */}
                    <div onMouseDown={handleResizeDown('sw')} className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-[60] group flex items-end justify-start p-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* SE Handle (Visible Triangle) */}
                    <div onMouseDown={handleResizeDown('se')} className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize z-[60] group flex items-end justify-end p-2 overflow-hidden">
                        <div className="w-4 h-4 border-r-2 border-b-2 border-slate-200 dark:border-white/10 rounded-br-sm transition-colors group-hover:border-indigo-500"></div>
                    </div>
                </>
            )}

            {showStatus && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] px-8 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {showStatus}
                </div>
            )}

            <FolderSelectionModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                initialSelectedFolderIds={selectedFolderIds}
                onSave={setSelectedFolderIds}
            />
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onDeleteAll={async () => {
                    await chrome.storage.local.clear();
                    setTitle(''); setContent('');
                    displayStatus('All data deleted');
                }}
            />
        </div>
    );
};

export default StickyNotes;
