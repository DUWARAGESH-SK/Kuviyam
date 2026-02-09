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
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDark, setIsDark] = useState(true);
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
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);

        const loadDraft = () => {
            chrome.storage.local.get(['panelDraft']).then((res) => {
                const draft = res.panelDraft as any;
                if (draft) {
                    setTitle(prev => draft.title !== undefined ? draft.title : prev);
                    setContent(prev => draft.content !== undefined ? draft.content : prev);
                    setTagsInput(prev => draft.tags ? draft.tags.join(', ') : prev);
                    setIsPinned(prev => draft.pinned !== undefined ? draft.pinned : prev);
                    setSelectedFolderIds(prev => draft.folderIds || prev);
                }
            });
        };

        loadDraft();

        // Sync across tabs
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.panelDraft) {
                const draft = changes.panelDraft.newValue as NoteDraft & { updatedAt: number };
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

        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            if (recognitionRef.current) {
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;

                recognitionRef.current.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                    }
                    if (finalTranscript) insertTextAtCursor(finalTranscript + ' ');
                };
                recognitionRef.current.onend = () => setIsListening(false);
                recognitionRef.current.onerror = () => setIsListening(false);
            }
        }

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
                const newLayout = { ...layout, x: newX, y: newY };
                setLayout(newLayout);
            } else if (resizeDir) {
                let newW = layout.width;
                let newH = layout.height;
                let newX = layout.x;
                let newY = layout.y;

                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;

                if (resizeDir.includes('e')) {
                    newW = Math.max(300, resizeStart.current.w + dx);
                } else if (resizeDir.includes('w')) {
                    const potentialW = resizeStart.current.w - dx;
                    if (potentialW > 300) {
                        newW = potentialW;
                        newX = resizeStart.current.lx + dx;
                    }
                }

                if (resizeDir.includes('s')) {
                    newH = Math.max(400, resizeStart.current.h + dy);
                } else if (resizeDir.includes('n')) {
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
            x: e.clientX,
            y: e.clientY,
            w: layout.width,
            h: layout.height,
            lx: layout.x,
            ly: layout.y
        };
    };

    const insertTextAtCursor = (text: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const newContent = content.substring(0, start) + text + content.substring(end);
            setContent(newContent);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
                    textareaRef.current.focus();
                }
            }, 0);
        } else {
            setContent(prev => prev + text);
        }
    };

    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags,
            pinned: isPinned,
            color: '#8B5CF6',
            domain: window.location.hostname,
            url: window.location.href,
            favicon: document.querySelector("link[rel~='icon']") ? (document.querySelector("link[rel~='icon']") as HTMLLinkElement).href : `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
            folderIds: selectedFolderIds
        };
        await storage.createNote(draft);
        displayStatus('Note Saved!');
        // Keep draft? User usually wants to keep editing or clear. 
        // Based on "Sticky Note" behavior, we might want to keep it.
    };

    const handleDeleteAll = async () => {
        await chrome.storage.local.clear();
        setTitle('');
        setContent('');
        setTagsInput('');
        setIsPinned(false);
        setSelectedFolderIds([]);
        displayStatus('All data deleted');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    const domain = window.location.hostname || 'Local';

    return (
        <div
            className={`font-display flex flex-col relative transition-all duration-300 ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[2147483647]' : ''}`}
            style={!isFocusMode ? {
                position: 'fixed',
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                borderRadius: '32px',
                boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                color: isDark ? 'white' : '#1e293b'
            } : {
                width: '100vw',
                height: '100vh',
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                pointerEvents: 'auto',
                zIndex: 2147483647,
                color: isDark ? 'white' : '#1e293b'
            }}
        >
            {/* Header */}
            <header
                onMouseDown={handleDragDown}
                className="px-8 py-6 flex items-center justify-between cursor-move select-none z-20"
            >
                <div className="flex items-center gap-6">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
                    >
                        <span className="material-symbols-rounded text-slate-500 dark:text-white/50 text-[20px]">chevron_left</span>
                    </button>
                    <span className="text-[18px] font-bold text-slate-400 dark:text-white/40 tracking-wide uppercase">EDIT NOTE</span>
                </div>

                <div className="flex items-center gap-3" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer">
                        <span className="material-symbols-rounded text-[20px]">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer">
                        <span className="material-symbols-rounded text-[20px]">{isFocusMode ? 'close_fullscreen' : 'expand_content'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-8 py-2.5 rounded-full font-bold text-[15px] hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] cursor-pointer ml-2"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Content Body */}
            <main className={`flex-1 flex flex-col relative overflow-hidden transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full pt-12' : ''}`}>

                {/* Meta info bar */}
                <div className="px-10 flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-white/30 text-[13px] font-bold uppercase tracking-[0.1em]">{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-1.5 rounded-full backdrop-blur-md border border-white/5">
                        <button onClick={() => setIsPinned(!isPinned)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${isPinned ? 'text-rose-500' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}>
                            <span className={`material-symbols-rounded text-[20px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                        </button>
                        <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10"></div>
                        <button onClick={() => setIsFolderModalOpen(true)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${selectedFolderIds.length > 0 ? 'text-indigo-500' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}>
                            <span className={`material-symbols-rounded text-[20px] ${selectedFolderIds.length > 0 ? 'fill-current' : ''}`}>create_new_folder</span>
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition-all cursor-pointer">
                            <span className="material-symbols-rounded text-[20px]">more_vert</span>
                        </button>
                    </div>
                </div>

                {/* Domain badge */}
                <div className="px-10 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 dark:text-indigo-300 text-[13px] font-semibold">
                        <span className="material-symbols-rounded text-[18px]">language</span>
                        <span>Linked to {domain}</span>
                        <span className="material-symbols-rounded text-[16px] ml-1">open_in_new</span>
                    </div>
                </div>

                {/* Text Editors */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-32 custom-scrollbar flex flex-col">
                    {/* Content Area - Large text as in image */}
                    <textarea
                        ref={textareaRef}
                        className="w-full bg-transparent text-[48px] font-black text-slate-800 dark:text-white mb-2 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 leading-[1.1] tracking-tight p-0 resize-none font-display overflow-hidden min-h-[1.2em]"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Title Area - Secondary heading as in image */}
                    <textarea
                        rows={1}
                        className="w-full bg-transparent text-[18px] font-bold text-slate-400 dark:text-white/40 mb-8 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 resize-none font-display overflow-hidden"
                        placeholder="# Actualize Tags"
                        value={title.startsWith('#') || !title ? title : `# ${title}`}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>
            </main>

            {/* Mic Button */}
            <div className={`absolute bottom-8 right-8 transition-all ${isFocusMode ? 'bottom-12 right-12' : ''}`}>
                <button
                    onClick={toggleVoice}
                    className={`w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-[0_15px_30px_-5px_rgba(79,70,229,0.5)] transition-all hover:scale-110 active:scale-95 z-50 cursor-pointer backdrop-blur-md border border-white/20 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                    <span className="material-symbols-rounded text-[28px]">mic</span>
                </button>
            </div>

            {/* Resize Handles */}
            {!isFocusMode && (
                <>
                    {/* NW */}
                    <div onMouseDown={handleResizeDown('nw')} className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-[60] group">
                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* NE */}
                    <div onMouseDown={handleResizeDown('ne')} className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-[60] group">
                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* SW */}
                    <div onMouseDown={handleResizeDown('sw')} className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-[60] group">
                        <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    {/* SE */}
                    <div onMouseDown={handleResizeDown('se')} className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-[60] group">
                        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-r-2 border-b-2 border-white/20 w-3 h-3 transition-opacity"></div>
                    </div>
                </>
            )}

            {showStatus && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] px-8 py-4 bg-black/80 backdrop-blur-xl text-white rounded-2xl shadow-2xl font-bold text-[16px] animate-in fade-in zoom-in duration-200 border border-white/10">
                    {showStatus}
                </div>
            )}

            <FolderSelectionModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                initialSelectedFolderIds={selectedFolderIds}
                onSave={(ids) => {
                    setSelectedFolderIds(ids);
                    displayStatus('Folders updated');
                }}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onDeleteAll={handleDeleteAll}
            />
        </div>
    );
};

export default StickyNotes;


