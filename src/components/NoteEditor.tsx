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

    // Voice Recognition
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (initialNote) {
            setTitle(initialNote.title);
            setContent(initialNote.content);
            setTagsInput(initialNote.tags.join(', '));
        }

        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setContent(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
        }
    }, [initialNote]);

    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
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

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onCancel} className="text-sm text-tokyo-fg opacity-70 hover:opacity-100">Cancel</button>
                <div className="flex gap-2 items-center">
                    {initialNote?.domain && (
                        <span className="text-xs bg-tokyo-accent/10 text-tokyo-accent px-2 py-0.5 rounded border border-tokyo-accent/20 truncate max-w-[120px]">
                            {initialNote.domain}
                        </span>
                    )}

                    <button
                        onClick={handleExport}
                        className="text-tokyo-fg/70 hover:text-tokyo-accent p-1"
                        title="Export to TXT"
                    >
                        ↓
                    </button>

                    <button
                        onClick={handleSave}
                        className="bg-tokyo-accent text-tokyo-bg px-4 py-1 rounded font-bold text-sm hover:brightness-110"
                    >
                        Save
                    </button>
                </div>
            </div>

            <input
                type="text"
                placeholder="Title"
                className="bg-transparent text-xl font-bold text-tokyo-accent mb-2 outline-none placeholder-tokyo-fg/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <input
                type="text"
                placeholder="Tags (comma separated)..."
                className="bg-transparent text-xs text-tokyo-fg/60 mb-4 outline-none placeholder-tokyo-fg/20 border-b border-tokyo-fg/10 pb-1 focus:border-tokyo-accent/50 transition-colors"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
            />

            <div className="flex-1 relative">
                <textarea
                    placeholder="Start typing..."
                    className="w-full h-full bg-transparent text-tokyo-fg resize-none outline-none leading-relaxed placeholder-tokyo-fg/30"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                {recognitionRef.current && (
                    <button
                        onClick={toggleVoice}
                        className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-tokyo-card text-tokyo-fg hover:text-tokyo-accent'}`}
                        title="Dictate Note"
                    >
                        {isListening ? '🛑' : '🎙️'}
                    </button>
                )}
            </div>
        </div>
    );
};
