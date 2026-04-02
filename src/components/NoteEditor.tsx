import React, { useState, useEffect, useRef } from 'react';
import type { Note, NoteDraft } from '../types';
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
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [showStatus, setShowStatus] = useState<string | null>(null);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [linkedDomain, setLinkedDomain] = useState<string | null>(null);
    const [linkedUrl, setLinkedUrl] = useState<string | null>(null);
    const [linkedFavicon, setLinkedFavicon] = useState<string | null>(null);

    // Additional state for matching StickyNotes logic
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title || '');
            setContent(initialNote.content || '');
            setIsPinned(initialNote.pinned || false);
            setSelectedFolderIds(initialNote.folderIds || []);
            setTags(initialNote.tags || []);
            setLinkedDomain(initialNote.domain || null);
            setLinkedUrl(initialNote.url || null);
            setLinkedFavicon(initialNote.favicon || null);
        } else {
            setLinkedDomain(window.location.hostname);
            setLinkedUrl(window.location.href);
            setLinkedFavicon(`https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`);
        }
    }, [initialNote]);

    const addTag = () => {
        const trimmed = tagInput.trim().replace(/^#/, '');
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput('');
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !tagInput && tags.length) {
            setTags(tags.slice(0, -1));
        }
    };

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;

        // Capture any pending tag input that wasn't 'entered'
        let finalTags = [...tags];
        const pendingTag = tagInput.trim().replace(/^#/, '');
        if (pendingTag && !finalTags.includes(pendingTag)) {
            finalTags.push(pendingTag);
        }

        const draft: NoteDraft = {
            title: title || 'Untitled',
            content,
            tags: finalTags,
            pinned: isPinned,
            domain: linkedDomain || undefined,
            url: linkedUrl || undefined,
            favicon: linkedFavicon || undefined,
            folderIds: selectedFolderIds
        };
        onSave(draft, initialNote?.id);
        displayStatus('Note Saved!');
    };

    const displayStatus = (msg: string) => {
        setShowStatus(msg);
        setTimeout(() => setShowStatus(null), 2000);
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    return (
        <div
            className={`font-display flex flex-col transition-all duration-300 h-full ${isDark ? 'dark' : ''} ${isFocusMode ? 'fixed inset-0 z-[2147483647]' : 'relative'}`}
            style={{
                backgroundColor: isDark ? '#0F1115' : '#ffffff',
                color: isDark ? 'white' : '#1e293b'
            }}
        >
            {/* Header */}
            <header
                className={`px-8 py-6 flex items-center justify-between select-none border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl z-40 transition-all duration-300 ${isFocusMode ? 'absolute top-0 w-full opacity-0 hover:opacity-100 hover:pointer-events-auto pointer-events-none' : 'relative opacity-100'}`}
            >
                <div className="flex items-center gap-6 flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className={`w-11 h-11 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0 shadow-sm ${isFocusMode ? 'pointer-events-auto' : ''}`}
                    >
                        <span className="material-symbols-rounded text-slate-500 text-[24px] flex-shrink-0">chevron_left</span>
                    </button>
                    <span className="text-[18px] font-extrabold text-[#94A3B8] dark:text-white/40 tracking-wider whitespace-nowrap">{initialNote?.id ? 'EDIT NOTE' : 'NEW NOTE'}</span>
                </div>

                <div className={`flex items-center gap-4 flex-shrink-0 ${isFocusMode ? 'pointer-events-auto' : ''}`}>
                    <button onClick={onToggleTheme} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isDark ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#4F46E5] dark:hover:text-white transition-colors cursor-pointer flex-shrink-0">
                        <span className="material-symbols-rounded text-[24px] flex-shrink-0">{isFocusMode ? 'close_fullscreen' : 'expand_content'}</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#4F46E5] text-white px-9 py-2.5 rounded-full font-bold text-[16px] hover:bg-[#4338CA] active:scale-95 transition-all shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] ml-2 flex-shrink-0"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0F1115]">
                <div className={`flex-1 overflow-y-auto px-10 pb-32 custom-scrollbar transition-all duration-500 ${isFocusMode ? 'pt-24 max-w-3xl mx-auto w-full' : 'pt-10'}`}>

                    {/* Date and Action Pill */}
                    <div className={`flex items-center justify-between transition-all duration-300 ${isFocusMode ? 'mb-16 opacity-0 hover:opacity-100' : 'mb-10 opacity-100'}`}>
                        <span className="text-[#94A3B8] dark:text-white/30 text-[14px] font-bold tracking-[0.1em] whitespace-nowrap">{formattedDate}</span>

                        <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-white/5 p-1.5 rounded-full border border-slate-100 dark:border-white/5 flex-shrink-0">
                            <button onClick={() => setIsPinned(!isPinned)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${isPinned ? 'text-[#4F46E5]' : 'text-[#94A3B8] hover:text-slate-600 dark:hover:text-white'}`}>
                                <span className={`material-symbols-rounded text-[22px] flex-shrink-0 ${isPinned ? 'fill-current' : ''}`}>favorite</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1 flex-shrink-0"></div>
                            <button onClick={() => setIsFolderModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0">
                                <span className="material-symbols-rounded text-[22px] flex-shrink-0">create_new_folder</span>
                            </button>

                        </div>
                    </div>

                    {/* Linked Domain Pill */}
                    <div className="mb-12">
                        {linkedDomain ? (
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#EEF2FF] dark:bg-indigo-500/5 border border-[#E0E7FF] dark:border-indigo-500/10 rounded-2xl text-[#4F46E5] dark:text-indigo-400 font-bold text-[14px] flex-shrink-0">
                                <span className="material-symbols-rounded text-[20px] flex-shrink-0">language</span>
                                <span className="whitespace-nowrap">Linked to {linkedDomain}</span>
                                <a href={linkedUrl || '#'} target="_blank" rel="noopener noreferrer" className="material-symbols-rounded text-[18px] ml-1 opacity-50 hover:opacity-100 flex-shrink-0 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">open_in_new</a>
                                <div className="w-[1px] h-4 bg-indigo-200 dark:bg-indigo-500/30 mx-1"></div>
                                <button 
                                    onClick={() => { setLinkedDomain(null); setLinkedUrl(null); setLinkedFavicon(null); }}
                                    className="material-symbols-rounded text-[18px] opacity-60 hover:opacity-100 flex-shrink-0 hover:text-red-500 transition-colors"
                                    title="Unlink from website"
                                >
                                    link_off
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setLinkedDomain(window.location.hostname); setLinkedUrl(window.location.href); setLinkedFavicon(`https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`); }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 dark:text-slate-400 font-bold text-[14px] flex-shrink-0 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-rounded text-[20px] flex-shrink-0">link_off</span>
                                <span className="whitespace-nowrap">Not linked to a site</span>
                                <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1"></div>
                                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">Link to current site</span>
                            </button>
                        )}
                    </div>

                    {/* Primary Title Editor (Big Text) */}
                    <textarea
                        className="w-full bg-transparent text-[52px] font-black text-[#1E293B] dark:text-white mb-2 outline-none border-none focus:ring-0 placeholder-slate-200 dark:placeholder-white/5 leading-[1.1] tracking-tighter p-0 resize-none font-display overflow-hidden"
                        placeholder="Untitled"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />

                    {/* Secondary Title Area (Tag) */}
                    <div className="flex items-center gap-2 mb-8 group">
                        <span className="material-symbols-rounded text-[#94A3B8] dark:text-white/20 text-[24px] font-bold flex-shrink-0">tag</span>
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            {tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] dark:bg-indigo-500/10 border border-[#E0E7FF] dark:border-indigo-500/20 rounded-xl text-[#4F46E5] dark:text-indigo-400 font-bold text-[14px]">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors flex items-center justify-center">
                                        <span className="material-symbols-rounded text-[16px]">close</span>
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-[22px] font-bold text-[#94A3B8] dark:text-white/30 outline-none border-none focus:ring-0 placeholder-slate-300 dark:placeholder-white/10 p-0 font-display min-w-[150px]"
                                placeholder={tags.length === 0 ? "Add tags (press Enter)" : "Add more tags..."}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                onBlur={() => tagInput.trim() && addTag()}
                            />
                        </div>
                    </div>

                    {/* Main Content Editor */}
                    <textarea
                        className="w-full bg-transparent text-[18px] text-[#475569] dark:text-gray-300 outline-none border-none focus:ring-0 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed p-0 resize-none font-display overflow-hidden min-h-[300px]"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>


            </main>

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
        </div>
    );
};

