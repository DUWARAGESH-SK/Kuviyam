import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';

interface NoteEditorProps {
    initialNote?: Note | null;
    onSave: (draft: NoteDraft, id?: string) => void;
    onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ initialNote, onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
            setTagsInput(initialNote.tags.join(', '));
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
            pinned: initialNote?.pinned || false
        }, initialNote?.id);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            insertTextAtCursor(text);
        } catch (err) {
            console.error('Failed to read clipboard');
        }
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
            className={`flex flex-col h-full bg-[#FCFCFF] dark:bg-slate-900 transition-all duration-300 relative font-display ${isFocusMode ? 'p-0' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* 1. Exact Header */}
            <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="w-11 h-11 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-rounded text-[#1E293B] dark:text-slate-300">chevron_left</span>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Sticky</span>
                        <span className="text-[19px] font-[900] text-[#1E293B] dark:text-white leading-[1.1]">Note</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#F8FAFC] dark:bg-slate-800 p-1 rounded-[20px] gap-0 border border-slate-50 dark:border-slate-700">
                        <button className="w-11 h-11 flex items-center justify-center text-amber-400">
                            <span className="material-symbols-rounded text-[24px]">lightbulb</span>
                        </button>
                        <button className="w-11 h-11 flex items-center justify-center text-[#F97316]">
                            <span className="material-symbols-rounded text-[24px]">ios_share</span>
                        </button>
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`w-11 h-11 flex items-center justify-center ${isFocusMode ? 'text-[#7070FF]' : 'text-slate-400'}`}
                        >
                            <span className="material-symbols-rounded text-[24px]">open_in_full</span>
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-[#7070FF] text-white px-9 py-3 rounded-[18px] font-black text-sm shadow-[0_8px_20px_-4px_rgba(112,112,255,0.4)] hover:brightness-110 transition-all active:scale-95 tracking-wide"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* 2. Content Area */}
            <div className={`flex-1 overflow-auto px-8 pt-10 pb-32 transition-all ${isFocusMode ? 'max-w-4xl mx-auto w-full' : ''}`}>
                {/* Meta Row */}
                <div className="flex items-center justify-between mb-10">
                    <button onClick={onCancel} className="flex items-center gap-2 group">
                        <span className="material-symbols-rounded text-[#7070FF] text-lg font-bold">arrow_back</span>
                        <span className="text-[#7070FF] font-[900] text-[11px] tracking-[0.14em] uppercase">Drafts</span>
                    </button>
                    <div className="flex items-center gap-6">
                        <button className="text-[#F43F5E] transition-transform hover:scale-110">
                            <span className="material-symbols-rounded text-[22px] fill-current">favorite</span>
                        </button>
                        <button className="w-6 h-6 rounded-[4px] bg-[#8B5CF6] shadow-sm"></button>
                        <button className="text-slate-400">
                            <span className="material-symbols-rounded text-[24px]">more_horiz</span>
                        </button>
                    </div>
                </div>

                {/* Exact Title */}
                <input
                    type="text"
                    placeholder="Note Title"
                    className="w-full bg-transparent text-[36px] font-[900] text-[#0F172A] dark:text-white mb-6 outline-none placeholder-slate-200 dark:placeholder-slate-700 leading-tight uppercase tracking-tight"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Exact Tags */}
                <div className="flex flex-wrap gap-3 mb-10 items-center">
                    {tags.map((tag, idx) => (
                        <div
                            key={idx}
                            className={`px-5 py-2 rounded-full flex items-center gap-2 text-[14px] font-bold ${idx % 2 === 0
                                    ? 'bg-[#DCFCE7] text-[#166534] dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-[#FEF9C3] text-[#854D0E] dark:bg-amber-500/10 dark:text-amber-400'
                                }`}
                        >
                            #{tag.toLowerCase()}
                            <button
                                onClick={() => {
                                    const newTags = tags.filter((_, i) => i !== idx);
                                    setTagsInput(newTags.join(', '));
                                }}
                                className="opacity-60 hover:opacity-100"
                            >
                                <span className="material-symbols-rounded text-[16px]">close</span>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newTag = prompt('Enter new tag:');
                            if (newTag) setTagsInput(prev => prev ? `${prev}, ${newTag}` : newTag);
                        }}
                        className="text-[#7070FF] font-black text-[14px] ml-2 hover:underline"
                    >
                        + Add tags
                    </button>
                </div>

                {/* Exact Floating Toolbar */}
                <div className="flex items-center gap-1 mb-12 px-7 py-4 bg-white dark:bg-slate-800 rounded-[22px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-slate-50 dark:border-slate-700/50 w-fit mx-auto sticky top-4 z-10 transition-shadow">
                    <button onClick={handleCopy} className="text-[#475569] dark:text-slate-300 font-extrabold text-[15px] px-3 hover:text-[#0F172A]">Copy</button>
                    <div className="w-[1.5px] h-5 bg-slate-100 dark:bg-slate-700 mx-2"></div>
                    <button onClick={handlePaste} className="text-[#475569] dark:text-slate-300 font-extrabold text-[15px] px-3 hover:text-[#0F172A]">Paste</button>
                    <div className="w-[1.5px] h-5 bg-slate-100 dark:bg-slate-700 mx-2"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="text-[#1E293B] dark:text-white font-[900] text-[18px] px-3">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="text-[#1E293B] dark:text-white italic text-[18px] px-3 serif">I</button>
                    <div className="w-[1.5px] h-5 bg-slate-100 dark:bg-slate-700 mx-2"></div>
                    <button onClick={() => insertTextAtCursor('- ')} className="flex items-center gap-2 text-[#475569] dark:text-white font-extrabold text-[15px] px-3">
                        <span className="w-2 h-2 rounded-full bg-[#7070FF]/50"></span>
                        List
                    </button>
                </div>

                {/* Editor Surface */}
                <div className="relative min-h-[400px]">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start your masterpiece here..."
                        className="w-full h-full min-h-[400px] bg-transparent text-[#64748B] dark:text-slate-300 text-[22px] font-medium resize-none outline-none leading-[1.6] placeholder-slate-200 dark:placeholder-slate-700"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>

            {/* Exact Voice FAB */}
            <button
                onClick={toggleVoice}
                className={`fixed bottom-12 right-10 w-[84px] h-[84px] rounded-full flex items-center justify-center shadow-[0_15px_40px_-5px_rgba(112,112,255,0.45)] transition-all hover:scale-105 active:scale-95 z-50 ${isListening
                        ? 'bg-[#F43F5E] animate-pulse text-white'
                        : 'bg-[#7070FF] text-white'
                    }`}
                title={isListening ? 'Stop Listening' : 'Start Dictation'}
            >
                <span className="material-symbols-rounded text-[38px]">mic</span>
                {!isListening && (
                    <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                )}
            </button>

            {/* Exact Footer */}
            <footer className="px-10 py-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[#94A3B8] dark:text-slate-500 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-[18px]">link</span>
                    <span className="text-[14px] font-bold">Linked to:</span>
                    <a
                        href={initialNote?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7070FF] font-bold text-[14px] hover:underline"
                    >
                        {initialNote?.domain || 'localhost'}
                    </a>
                </div>
                <div className="relative w-5 h-5">
                    <div className="absolute right-0 bottom-0 w-full h-full border-r-[3px] border-b-[3px] border-[#7070FF]/25 rounded-br-[4px]"></div>
                </div>
            </footer>
        </div>
    );
};
