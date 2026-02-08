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
    const [noteColor, setNoteColor] = useState('#8B5CF6'); // Default purple
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
            setNoteColor(initialNote.color || '#8B5CF6');
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
            color: noteColor,
            folderIds: selectedFolderIds
        }, initialNote?.id);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        displayStatus('Copied to clipboard!');
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            insertTextAtCursor(text);
        } catch (err) {
            displayStatus('Paste failed');
        }
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

        // Immediate save for favorite state if note exists
        if (initialNote?.id) {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            onSave({
                title: title || 'Untitled',
                content,
                tags,
                domain: initialNote?.domain,
                url: initialNote?.url,
                pinned: newPinned,
                color: noteColor,
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

    const toggleColor = () => {
        const colors = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6'];
        const nextIdx = (colors.indexOf(noteColor) + 1) % colors.length;
        setNoteColor(colors[nextIdx]);
    };

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div
            className={`flex flex-col h-full bg-white dark:bg-[#0B0F1A] transition-all duration-300 relative font-display ${isFocusMode ? 'fixed inset-0 z-[9999]' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* 1. Primary Header */}
            {!isFocusMode && (
                <header className="px-8 py-7 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-[#0B0F1A]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-rounded text-slate-500 dark:text-slate-400 text-[24px]">chevron_left</span>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[20px] font-black text-[#1E293B] dark:text-white leading-tight">Sticky</span>
                            <span className="text-[20px] font-black text-[#1E293B] dark:text-white leading-tight">Note</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-[#F8FAFC] dark:bg-slate-800/80 p-1.5 rounded-full gap-1 border border-slate-50 dark:border-slate-700/50">

                            <button
                                onClick={onToggleTheme}
                                className="w-11 h-11 flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                                title={isDark ? 'Light Mode' : 'Dark Mode'}
                            >
                                <span className="material-symbols-rounded text-[24px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
                            </button>
                            <button
                                onClick={handleExport}
                                className="w-11 h-11 flex items-center justify-center text-[#F97316] hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
                                title="Export as .txt"
                            >
                                <span className="material-symbols-rounded text-[24px]">download</span>
                            </button>
                            <button
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors cursor-pointer ${isFocusMode ? 'text-[#7070FF] bg-white dark:bg-slate-700' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                                title="Focus Mode"
                            >
                                <span className="material-symbols-rounded text-[24px]">open_in_full</span>
                            </button>
                        </div>
                        <button
                            onClick={handleSave}
                            className="bg-[#7070FF] text-white px-9 py-3.5 rounded-[22px] font-black text-[15px] shadow-[0_12px_35px_-5px_rgba(112,112,255,0.5)] hover:brightness-110 active:scale-95 transition-all tracking-tight cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </header>
            )}

            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed top-8 right-8 w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center z-[10000] text-slate-500 hover:text-[#7070FF] transition-all shadow-xl cursor-pointer"
                    title="Exit Focus Mode"
                >
                    <span className="material-symbols-rounded text-2xl">close_fullscreen</span>
                </button>
            )}

            {/* 2. Content Body */}
            <main className={`flex-1 overflow-y-auto overflow-x-hidden px-10 pt-10 pb-32 transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full pt-20' : ''}`}>
                {/* Secondary Header Row */}
                {!isFocusMode && (
                    <div className="flex items-center justify-between mb-10">
                        <button onClick={onCancel} className="flex items-center gap-2 group cursor-pointer">
                            <span className="material-symbols-rounded text-[#7070FF] text-xl font-black">arrow_back</span>
                            <span className="text-[#7070FF] font-black text-[13px] tracking-[0.18em] uppercase">Drafts</span>
                        </button>
                        <div className="flex items-center gap-7">
                            <button
                                onClick={handleToggleFavorite}
                                className={`transition-all duration-300 hover:scale-125 cursor-pointer ${isPinned ? 'text-[#F43F5E]' : 'text-slate-300 dark:text-slate-700'}`}
                                title={isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                            >
                                <span className={`material-symbols-rounded text-[28px] ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <button
                                onClick={() => setIsFolderModalOpen(true)}
                                className="text-slate-300 dark:text-slate-700 hover:text-primary transition-colors cursor-pointer"
                                title="Add to Folder"
                            >
                                <span className={`material-symbols-rounded text-[24px] ${selectedFolderIds.length > 0 ? 'fill-current text-primary' : ''}`}>create_new_folder</span>
                            </button>
                            <button
                                onClick={() => displayStatus('Options coming soon!')}
                                className="text-slate-300 dark:text-slate-700 hover:text-slate-500 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-rounded text-[32px]">more_horiz</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Title Input */}
                <textarea
                    rows={2}
                    placeholder="UNTITLED NOTE"
                    className="w-full bg-transparent text-[36px] font-black text-[#1E293B] dark:text-white mb-6 outline-none border-none focus:ring-0 placeholder-[#E2E8F0] dark:placeholder-slate-800 leading-[1.1] tracking-tight p-0 uppercase resize-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Folder Selection Pills */}
                {(selectedFolderIds.length > 0 || isFolderModalOpen) && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {selectedFolderIds.map(id => {
                            const folder = folders.find(f => f.id === id);
                            if (!folder) return null;
                            return (
                                <div key={id} className="flex items-center gap-1 pl-3 pr-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 group">
                                    <span className="material-symbols-rounded text-sm">folder</span>
                                    <span>{folder.name}</span>
                                    <button
                                        onClick={() => setSelectedFolderIds(prev => prev.filter(fid => fid !== id))}
                                        className="ml-1 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer opacity-50 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-rounded text-sm">close</span>
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className="flex items-center justify-center w-6 h-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-[#7070FF] transition-colors cursor-pointer border border-dashed border-[#7070FF]/30"
                            title="Edit Folders"
                        >
                            <span className="material-symbols-rounded text-sm">edit</span>
                        </button>
                    </div>
                )}

                {/* Tag Cluster */}
                <div className="flex flex-wrap gap-3 mb-12 items-center">
                    {tags.map((tag, idx) => (
                        <div
                            key={idx}
                            className={`px-5 py-2.5 rounded-full flex items-center gap-3 text-[14px] font-black shadow-sm ${idx % 2 === 0
                                ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#064E3B] dark:text-[#34D399]'
                                : 'bg-[#FEF9C3] text-[#854D0E] dark:bg-[#78350F] dark:text-[#FBBF24]'
                                }`}
                        >
                            #{tag.toLowerCase()}
                            <button
                                onClick={() => {
                                    const newTags = tags.filter((_, i) => i !== idx);
                                    setTagsInput(newTags.join(', '));
                                }}
                                className="opacity-40 hover:opacity-100 flex items-center cursor-pointer"
                            >
                                <span className="material-symbols-rounded text-[18px]">close</span>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newTag = prompt('Enter new tag:');
                            if (newTag) setTagsInput(prev => prev ? `${prev}, ${newTag}` : newTag);
                        }}
                        className="text-[#7070FF] font-black text-[14px] ml-1 hover:underline transition-all cursor-pointer"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Rich Toolbar */}
                <div className="flex items-center gap-1 mb-14 px-8 py-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-[32px] shadow-[0_15px_45px_-10px_rgba(0,0,0,0.12)] border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-4 z-10 transition-all hover:shadow-[0_20px_55px_-10px_rgba(0,0,0,0.15)]">
                    <button onClick={handleCopy} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-4 hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer">Copy</button>
                    <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={handlePaste} className="text-[#64748B] dark:text-slate-400 font-black text-[15px] px-4 hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer">Paste</button>
                    <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-[#1E293B] dark:text-white font-black text-[20px] px-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-[#1E293B] dark:text-white italic text-[20px] px-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer">I</button>
                    <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-700 mx-1"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2.5 px-4 h-10 text-[15px] font-black text-[#64748B] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer">
                        <span className="w-3 h-3 rounded-full bg-[#7070FF]"></span>
                        List
                    </button>
                </div>

                {/* Main Text Surface */}
                <div className="relative min-h-[500px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[500px] bg-transparent text-[#64748B] dark:text-slate-400 text-[26px] font-medium resize-none outline-none border-none focus:ring-0 leading-[1.65] placeholder-[#E2E8F0] dark:placeholder-slate-800 p-0"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </main>

            {/* 3. Real Mic FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-16 right-12 w-[100px] h-[100px] rounded-full flex items-center justify-center shadow-[0_25px_60px_-10px_rgba(112,112,255,0.5)] transition-all hover:scale-105 active:scale-95 z-50 cursor-pointer ${isListening ? 'bg-[#F43F5E] animate-pulse text-white' : 'bg-[#7070FF] text-white'
                    }`}
            >
                <span className="material-symbols-rounded text-[48px]">mic</span>
            </button>

            {/* 4. Context Footer */}
            {!isFocusMode && (
                <footer className="px-10 py-10 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between bg-white/80 dark:bg-[#0B0F1A]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4 text-[#94A3B8] dark:text-slate-500 font-bold text-[15px]">
                        <span className="material-symbols-rounded text-[22px]">link</span>
                        <span className="font-bold">Linked to:</span>
                        <a
                            href={initialNote?.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#7070FF] font-black hover:underline transition-all"
                        >
                            {initialNote?.domain || 'localhost'}
                        </a>
                    </div>
                </footer>
            )}

            {/* The Blue Triangle Accent - Inset in Footer area */}
            {!isFocusMode && (
                <div className="absolute bottom-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                    <div className="absolute bottom-[-24px] right-[-24px] w-12 h-12 bg-[#7070FF]/15 rotate-45"></div>
                </div>
            )}

            {/* Status Toast */}
            {showStatus && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-7 py-3.5 bg-[#1E293B] text-white rounded-3xl shadow-2xl font-black text-[14px] animate-in fade-in slide-in-from-top-4 duration-300">
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
                        // Auto-save changes if note exists
                        onSave({
                            title: title || 'Untitled',
                            content,
                            tags,
                            domain: initialNote?.domain,
                            url: initialNote?.url,
                            pinned: isPinned,
                            color: noteColor,
                            folderIds: ids
                        }, initialNote.id);
                    }
                }}
            />
        </div>

    );
};
