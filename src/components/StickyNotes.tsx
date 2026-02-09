import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import type { PanelLayout, NoteDraft } from '../types';

interface StickyNotesProps {
    onClose: () => void;
}

const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
    const [layout, setLayout] = useState({
        x: 50,
        y: 50,
        width: 380,
        height: 500,
        isMinimized: false,
        isOpen: true
    });

    // Position and size state
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [size, setSize] = useState({ width: 380, height: 500 });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaved, setIsSaved] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync with storage layout
    useEffect(() => {
        storage.getPanelLayout().then((l) => {
            if (l) {
                setLayout(l);
                setPosition({ x: l.x, y: l.y });
                setSize({ width: l.width, height: l.height });
            }
        });

        // Load draft
        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || '');
                setContent(draft.content || '');
            }
        });
    }, []);

    // Format date like "MONDAY, 9 FEBRUARY"
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase().replace(/(\d+)/, '$1,');

    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('textarea') ||
            (e.target as HTMLElement).closest('input')) {
            return;
        }

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && !isResizing) {
                const newX = e.clientX - dragOffset.x;
                const newY = Math.max(0, e.clientY - dragOffset.y);

                setPosition({ x: newX, y: newY });
            } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;

                const newWidth = Math.max(300, resizeStart.width + deltaX);
                const newHeight = Math.max(300, resizeStart.height + deltaY);

                setSize({ width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                storage.savePanelLayout({ ...layout, x: position.x, y: position.y });
            }
            if (isResizing) {
                setIsResizing(false);
                storage.savePanelLayout({ ...layout, width: size.width, height: size.height });
            }
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragOffset, resizeStart, position, size, layout]);

    const handleSave = async () => {
        const noteDraft = {
            title,
            content,
            updatedAt: Date.now()
        };
        chrome.storage.local.set({ panelDraft: noteDraft });

        const newNote = {
            title: title || 'Untitled',
            content,
            tags: [],
            pinned: false,
            domain: window.location.hostname,
            url: window.location.href,
            favicon: `https://www.google.com/s2/favicons?domain=${window.location.hostname}`,
            folderIds: []
        };
        await storage.createNote(newNote);

        setIsSaved(true);
        setTitle('');
        setContent('');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setIsSaved(false);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setIsSaved(false);
    };

    const domain = window.location.hostname || 'chat.deepseek.com';

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                minHeight: '400px',
                zIndex: 2147483647,
                backgroundColor: '#ffffff',
                color: '#1e293b',
                // EXPLICIT SYSTEM FONT STACK TO FIX GARBLED TEXT
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
            className="flex flex-col rounded-xl shadow-2xl border border-gray-200 font-sans select-none"
        >
            {/* HEADER */}
            <header
                onMouseDown={handleDragStart}
                className="px-6 py-4 flex items-center justify-between cursor-move border-b border-gray-100 bg-gray-50 rounded-t-xl"
            >
                <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 tracking-wide">EDIT NOTE</span>
                </div>

                <div className="flex items-center gap-2">
                    {!isSaved && (
                        <span className="text-xs text-gray-400 font-medium animate-pulse">Unsaved</span>
                    )}
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        Save
                    </button>
                    <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 font-bold px-2">
                        ✕
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col p-6 overflow-hidden bg-white rounded-b-xl relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    {/* Date */}
                    <div className="mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {formattedDate}
                        </span>
                    </div>

                    {/* Linked Domain */}
                    <div className="mb-6">
                        <span className="text-sm font-medium text-indigo-600">
                            Linked to {domain}
                        </span>
                    </div>

                    {/* "UI Issues in" Label */}
                    <div className="mb-1">
                        <span className="text-lg font-medium text-gray-700 block">
                            UI Issues in
                        </span>
                    </div>

                    {/* Title Input */}
                    <div className="mb-6 flex items-center border-b border-transparent focus-within:border-indigo-50 transition-colors">
                        <div className="flex items-center w-full">
                            <span className="text-2xl font-bold text-gray-400 mr-2">#</span>
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none border-none focus:ring-0 p-0 placeholder-gray-300"
                                placeholder="Actualize Tags"
                                value={title}
                                onChange={handleTitleChange}
                            />
                        </div>
                    </div>

                    {/* Content Textarea */}
                    <textarea
                        className="w-full flex-1 bg-transparent text-base leading-relaxed text-gray-700 outline-none border-none focus:ring-0 placeholder-gray-400 p-0 resize-none min-h-[150px]"
                        placeholder="Type something amazing..."
                        value={content}
                        onChange={handleContentChange}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-end justify-end p-2"
                >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-gray-300 hover:border-indigo-500 transition-colors"></div>
                </div>
            </main>
        </div>
    );
};

export default StickyNotes;
