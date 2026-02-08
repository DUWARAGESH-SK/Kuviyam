import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft, Folder } from '../types';
import { storage } from '../utils/storage';
import { FolderSelectionModal } from './FolderSelectionModal';

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (draft: NoteDraft, id?: string) => void;
    onCancel: () => void;
    isDark: boolean;
    onToggleTheme: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onCancel, isDark, onToggleTheme }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        loadFolders();
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
            setTagsInput(initialNote.tags.join(', '));
            setIsPinned(initialNote.pinned || false);
            setSelectedFolderIds(initialNote.folderIds || []);
        }

        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    insertTextAtCursor(finalTranscript + ' ');
                }
            };

            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = () => setIsListening(false);
        }
    }, [initialNote]);

    const loadFolders = async () => {
        const loaded = await storage.getFolders();
        setFolders(loaded);
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

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        onSave({
            title: title || 'Untitled',
            content,
            tags,
            domain: initialNote?.domain,
            url: initialNote?.url,
            pinned: isPinned,
            color: '#8B5CF6', // Default
            folderIds: selectedFolderIds
        }, initialNote?.id);
    };

    const handleExport = () => {
        const textToExport = `Title: ${title || 'Untitled'}\n\n${content}\n\nTags: ${tagsInput}\nSource: ${initialNote?.url || 'N/A'}`;
        const blob = new Blob([textToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'Note').replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayStatus('Note exported as .txt');
    };

    const handleToggleFavorite = () => {
        const newPinned = !isPinned;
        setIsPinned(newPinned);
        if (initialNote?.id) {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            onSave({
                title: title || 'Untitled',
                content,
                tags,
                domain: initialNote?.domain,
                url: initialNote?.url,
                pinned: newPinned,
                color: '#8B5CF6',
                folderIds: selectedFolderIds
            }, initialNote?.id);
        }
        displayStatus(newPinned ? 'Added to Favorites' : 'Removed from Favorites');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            insertTextAtCursor(text + '\n');
        }
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`flex flex-col h-full bg-white dark:bg-[#0F1115] transition-all duration-300 relative font-display ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[9999]' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* 1. Primary Header */}
            {!isFocusMode && (
                <header className="px-8 py-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0F1115]/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
                        >
                            <span className="material-symbols-rounded text-slate-500 dark:text-white/50 text-[20px]">chevron_left</span>
                        </button>
                        <span className="text-[16px] font-bold text-slate-400 dark:text-white/40 tracking-wide uppercase">Edit Note</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleTheme}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer"
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
                        >
                            <span className="material-symbols-rounded text-[20px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                        </button>
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white rounded-full transition-colors cursor-pointer"
                            title="Focus Mode"
                        >
                            <span className="material-symbols-rounded text-[20px]">{isFocusMode ? 'close_fullscreen' : 'open_in_full'}</span>
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-[14px] hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </header>
            )}

            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-8 right-8 w-14 h-14 rounded-full bg-slate-200 dark:bg-white/10 backdrop-blur-md flex items-center justify-center z-[10000] text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all shadow-xl cursor-pointer"
                    title="Exit Focus Mode"
                >
                    <span className="material-symbols-rounded text-2xl">close_fullscreen</span>
                </button>
            )}

            {/* 2. Content Body */}
            <main className={`flex-1 flex flex-col relative overflow-hidden transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full pt-20' : ''}`}>

                {/* Secondary Actions (Discrete Folder & Fav) */}
                {!isFocusMode && (
                    <div className="px-10 flex items-center justify-between mb-8 pt-6">
                        <div className="flex items-center gap-1">
                            <span className="text-slate-400 dark:text-white/20 text-xs font-bold uppercase tracking-wider">{new Date(initialNote?.updatedAt || Date.now()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-1.5 rounded-full backdrop-blur-md">
                            <button
                                onClick={handleToggleFavorite}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${isPinned ? 'text-rose-500' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}
                                title="Add to Favorites"
                            >
                                <span className={`material-symbols-rounded text-[20px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10"></div>
                            <button
                                onClick={() => setIsFolderModalOpen(true)}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 ${selectedFolderIds.length > 0 ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}
                                title="Organize"
                            >
                                <span className={`material-symbols-rounded text-[20px] ${selectedFolderIds.length > 0 ? 'fill-current' : ''}`}>create_new_folder</span>
                            </button>
                            <button className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5 transition-all cursor-pointer">
                                <span className="material-symbols-rounded text-[20px]">more_vert</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Scroll Container */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-32 custom-scrollbar">

                    {/* Title Input */}
                    <textarea
                        rows={1}
                        placeholder="Untitled"
                        className="w-full bg-transparent text-[40px] font-black text-slate-800 dark:text-white mb-6 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/20 leading-[1.1] tracking-tight p-0 resize-none font-display overflow-hidden"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8 animate-fade-in">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[13px] font-bold border border-indigo-500/20">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Tag Input Trigger */}
                    <button
                        onClick={() => {
                            const newTag = prompt('Add tags (comma separated):', tagsInput);
                            if (newTag !== null) setTagsInput(newTag);
                        }}
                        className="text-slate-400 dark:text-white/20 text-sm font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-8 flex items-center gap-2 group w-fit"
                    >
                        <span className="material-symbols-rounded text-lg group-hover:scale-110 transition-transform">tag</span>
                        Actualize Tags
                    </button>

                    {/* Main Content */}
                    <textarea
                        ref={textareaRef}
                        placeholder="Type something amazing..."
                        className="w-full min-h-[60vh] bg-transparent text-slate-700 dark:text-slate-300 text-[20px] font-medium resize-none outline-none border-none focus:ring-0 leading-[1.7] placeholder-slate-400 dark:placeholder-white/10 p-0 font-display text-left"
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.max(e.target.scrollHeight, 400) + 'px';
                        }}
                    />
                </div>
            </main>

            {/* 3. Floating Tools */}
            <div className={`absolute bottom-8 right-8 flex flex-col items-center gap-4 transition-all ${isFocusMode ? 'bottom-12 right-12' : ''}`}>
                <button
                    onClick={toggleVoice}
                    className={`w-[70px] h-[70px] rounded-full flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:scale-105 active:scale-95 z-50 cursor-pointer backdrop-blur-md border border-white/20 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600/90 text-white hover:bg-indigo-600'}`}
                >
                    <span className="material-symbols-rounded text-[32px]">mic</span>
                </button>
            </div>

            {/* Status Toast */}
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
                    if (initialNote?.id) {
                        displayStatus('Folders updated');
                        onSave({
                            title: title || 'Untitled',
                            content,
                            tags,
                            domain: initialNote?.domain,
                            url: initialNote?.url,
                            pinned: isPinned,
                            color: '#8B5CF6',
                            folderIds: ids
                        }, initialNote.id);
                    }
                }}
            />
        </div>
    );
};

