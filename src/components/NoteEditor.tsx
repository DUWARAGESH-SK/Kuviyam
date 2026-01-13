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

        // Setup Speech Recognition (Browser support check)
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
            // Defer cursor update
            setTimeout(() => {
                textareaRef.current!.selectionStart = textareaRef.current!.selectionEnd = start + text.length;
                textareaRef.current!.focus();
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
            title,
            content,
            tags,
            domain: initialNote?.domain,
            url: initialNote?.url,
            pinned: initialNote?.pinned || false
        }, initialNote?.id);
    };

    const handleExport = () => {
        const text = `Title: ${title}\nTags: ${tagsInput}\nURL: ${initialNote?.url || ''}\n\n${content}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'note'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Toolbar Actions
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        // Optional toast could go here
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            insertTextAtCursor(text);
        } catch (err) {
            console.error('Failed to read clipboard');
        }
    };

    // Drag & Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            insertTextAtCursor(text + '\n');
        }
    };

    return (
        <div
            className={`flex flex-col h-full transition-all duration-300 ${isFocusMode ? 'absolute inset-0 z-50 bg-tokyo-bg p-6' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {/* Header / Toolbar */}
            <div className={`flex justify-between items-center mb-4 ${isFocusMode ? 'max-w-2xl mx-auto w-full' : ''}`}>
                <div className="flex gap-2 items-center">
                    <button onClick={onCancel} className="text-sm text-tokyo-fg-dim hover:text-white transition-colors">
                        ← Back
                    </button>
                    {isFocusMode && <span className="text-tokyo-accent font-bold text-sm ml-4">Focus Mode</span>}
                </div>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        className={`p-1.5 rounded transition-colors ${isFocusMode ? 'text-tokyo-accent bg-tokyo-accent/10' : 'text-tokyo-fg-dim hover:text-white'}`}
                        title="Toggle Focus Mode"
                    >
                        {isFocusMode ? '↙' : '↗'}
                    </button>

                    <button onClick={handleExport} className="p-1.5 text-tokyo-fg-dim hover:text-tokyo-accent transition-colors" title="Export">
                        ↓
                    </button>

                    <button
                        onClick={handleSave}
                        className="bg-tokyo-accent text-tokyo-bg px-4 py-1.5 rounded-md font-bold text-sm hover:bg-tokyo-accent-hover transition-all shadow-lg shadow-tokyo-accent/20"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Editing Area */}
            <div className={`flex flex-col flex-1 ${isFocusMode ? 'max-w-2xl mx-auto w-full' : ''}`}>
                <input
                    type="text"
                    placeholder="Note Title"
                    className="bg-transparent text-2xl font-bold text-tokyo-accent mb-3 outline-none placeholder-tokyo-fg/20"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />

                <input
                    type="text"
                    placeholder="Add tags..."
                    className="bg-transparent text-sm text-tokyo-secondary mb-6 outline-none placeholder-tokyo-fg/20 border-b border-white/5 pb-2 focus:border-tokyo-secondary/50 transition-colors"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                />

                {/* Rich Text Toolbar */}
                <div className="flex gap-2 mb-2 p-1.5 bg-tokyo-card/50 rounded-lg border border-white/5 w-fit">
                    <button onClick={handleCopy} className="p-1 hover:bg-white/10 rounded text-xs text-tokyo-fg" title="Copy Content">Copy</button>
                    <div className="w-px bg-white/10 h-4 self-center"></div>
                    <button onClick={handlePaste} className="p-1 hover:bg-white/10 rounded text-xs text-tokyo-fg" title="Paste Clipboard">Paste</button>
                    <div className="w-px bg-white/10 h-4 self-center"></div>
                    <button onClick={() => insertTextAtCursor('**bold** ')} className="p-1 hover:bg-white/10 rounded text-xs font-bold text-tokyo-fg" title="Bold">B</button>
                    <button onClick={() => insertTextAtCursor('*italic* ')} className="p-1 hover:bg-white/10 rounded text-xs italic text-tokyo-fg" title="Italic">I</button>
                    <button onClick={() => insertTextAtCursor('- ')} className="p-1 hover:bg-white/10 rounded text-xs text-tokyo-fg" title="List">• List</button>
                </div>

                <div className="flex-1 relative group">
                    <textarea
                        ref={textareaRef}
                        placeholder="Start writing..."
                        className={`w-full h-full bg-transparent text-tokyo-fg resize-none outline-none leading-relaxed placeholder-tokyo-fg/20 custom-scrollbar p-2 -ml-2 rounded-lg transition-colors ${isDragOver ? 'bg-tokyo-accent/10 border-2 border-dashed border-tokyo-accent' : ''}`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    {/* Voice Button */}
                    <button
                        onClick={toggleVoice}
                        className={`absolute bottom-4 right-4 p-3 rounded-full shadow-xl transition-all hover:scale-110 ${isListening ? 'bg-tokyo-error animate-pulse text-white' : 'bg-tokyo-card text-tokyo-fg hover:text-tokyo-accent border border-white/10'}`}
                        title={isListening ? 'Stop Listening' : 'Start Dictation'}
                    >
                        {isListening ? '🛑' : '🎙️'}
                    </button>
                </div>

                {initialNote?.url && (
                    <div className="mt-4 pt-4 border-t border-white/5 text-xs text-tokyo-fg-dim truncate">
                        Linked to: <a href={initialNote.url} target="_blank" rel="noopener noreferrer" className="text-tokyo-accent hover:underline">{initialNote.domain}</a>
                    </div>
                )}
            </div>
        </div>
    );
};
