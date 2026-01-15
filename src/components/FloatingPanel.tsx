import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import type { PanelLayout } from '../types';

interface FloatingPanelProps {
    onClose: () => void;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ onClose }) => {
    const [layout, setLayout] = useState<PanelLayout>({
        x: 50,
        y: 50,
        width: 400,
        height: 700,
        isMinimized: false,
        isOpen: true
    });

    const [draft, setDraft] = useState({
        title: 'RMD ENGINEERING COLLEGE',
        content: '',
        tags: ['education', 'college']
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    useEffect(() => {
        storage.getPanelLayout().then(setLayout);
        chrome.storage.local.get(['panelDraft']).then((res) => {
            if (res.panelDraft) setDraft(res.panelDraft as typeof draft);
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStart.current.x;
                const newY = Math.max(0, e.clientY - dragStart.current.y);
                setLayout(prev => ({ ...prev, x: newX, y: newY }));
            } else if (isResizing) {
                const newW = Math.max(320, resizeStart.current.w + (e.clientX - resizeStart.current.x));
                const newH = Math.max(400, resizeStart.current.h + (e.clientY - resizeStart.current.y));
                setLayout(prev => ({ ...prev, width: newW, height: newH }));
            }
        };

        const handleMouseUp = () => {
            if (isDragging || isResizing) {
                setIsDragging(false);
                setIsResizing(false);
                storage.savePanelLayout(layout);
            }
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, layout]);

    const handleDragDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - layout.x, y: e.clientY - layout.y };
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, w: layout.width, h: layout.height };
    };

    const updateDraft = (newDraft: Partial<typeof draft>) => {
        const updated = { ...draft, ...newDraft };
        setDraft(updated);
        chrome.storage.local.set({ panelDraft: updated });
    };

    return (
        <div
            className="font-display text-slate-900 bg-[#F8FAFF] flex flex-col relative"
            style={{
                position: 'fixed',
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                border: '1px solid rgba(99, 102, 241, 0.1)',
            }}
        >
            {/* Header / Drag Handle */}
            <header
                onMouseDown={handleDragDown}
                className="ios-safe-top sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-indigo-100/50 cursor-move"
            >
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform cursor-pointer px-0"
                        >
                            <span className="material-symbols-rounded">chevron_left</span>
                        </button>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-800 whitespace-nowrap">Sticky Note</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center bg-slate-100/50 rounded-2xl p-1 gap-1">
                            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-amber-400 hover:bg-white transition-all active:scale-90 px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[20px] fill-current">lightbulb</span>
                            </button>
                            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-orange-500 hover:bg-white transition-all active:scale-90 px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[20px]">ios_share</span>
                            </button>
                            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-purple-600 hover:bg-white transition-all active:scale-90 px-0 cursor-pointer">
                                <span className="material-symbols-rounded text-[20px]">filter_center_focus</span>
                            </button>
                        </div>
                        <button className="bg-[#6366F1] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-200 text-sm whitespace-nowrap px-0 cursor-pointer">
                            Save
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-8 pt-10 pb-20 relative overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                    <button className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:text-indigo-600 transition-colors px-0 cursor-pointer">
                        <span className="material-symbols-rounded text-[16px]">arrow_left_alt</span> Drafts
                    </button>
                    <div className="flex items-center gap-5">
                        <span className="material-symbols-rounded text-xl cursor-pointer text-rose-400 hover:text-rose-600 transition-colors fill-current">favorite</span>
                        <span className="material-symbols-rounded text-xl cursor-pointer text-purple-600 hover:text-purple-800 transition-colors">crop_square</span>
                        <span className="material-symbols-rounded text-xl cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">more_horiz</span>
                    </div>
                </div>

                <div className="mb-6">
                    <input
                        className="w-full bg-transparent border-none focus:ring-0 text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight placeholder-slate-300 p-0"
                        value={draft.title}
                        onChange={(e) => updateDraft({ title: e.target.value })}
                        placeholder="Note Title"
                    />
                </div>

                <div className="flex flex-wrap gap-2.5 mb-10">
                    {draft.tags.map(tag => (
                        <div key={tag} className={`${tag === 'education' ? 'bg-[#DCFCE7] text-green-700 border-green-200/50' : 'bg-[#FEF9C3] text-amber-700 border-yellow-200/50'} px-4 py-1.5 rounded-full text-[13px] font-bold border flex items-center gap-1.5 shadow-sm`}>
                            #{tag}
                            <span
                                className="material-symbols-rounded text-[14px] cursor-pointer opacity-60"
                                onClick={() => updateDraft({ tags: draft.tags.filter(t => t !== tag) })}
                            >close</span>
                        </div>
                    ))}
                    <button className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-600 px-2 py-1.5 transition-colors px-0 cursor-pointer">
                        + Add tags
                    </button>
                </div>

                <div className="mb-10 flex">
                    <div className="bg-white/75 backdrop-blur-md border border-white/60 inline-flex items-center rounded-2xl px-2 py-2 shadow-2xl shadow-indigo-100/30 gap-1">
                        <button className="px-4 py-1.5 text-sm font-bold text-slate-700 hover:text-[#6366F1] transition-colors px-0 cursor-pointer">Copy</button>
                        <div className="w-px h-4 bg-slate-200/60"></div>
                        <button className="px-4 py-1.5 text-sm font-bold text-slate-700 hover:text-[#6366F1] transition-colors px-0 cursor-pointer">Paste</button>
                        <div className="w-px h-4 bg-slate-200/60"></div>
                        <button className="w-9 h-9 flex items-center justify-center font-black text-slate-700 hover:bg-white/60 rounded-xl px-0 cursor-pointer">B</button>
                        <button className="w-9 h-9 flex items-center justify-center italic font-serif text-slate-700 hover:bg-white/60 rounded-xl px-0 cursor-pointer">I</button>
                        <button className="flex items-center gap-2 px-3 h-9 text-sm font-bold text-slate-700 hover:bg-white/60 rounded-xl px-0 cursor-pointer">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> List
                        </button>
                    </div>
                </div>

                <div className="relative flex-1">
                    <textarea
                        className="w-full h-full bg-transparent border-none focus:ring-0 text-lg leading-relaxed text-slate-600 resize-none placeholder-slate-300 font-medium p-0"
                        placeholder="Start your masterpiece here..."
                        value={draft.content}
                        onChange={(e) => updateDraft({ content: e.target.value })}
                    ></textarea>
                </div>

                {/* Mic Button */}
                <button className="absolute bottom-12 right-8 w-16 h-16 bg-[#6366F1] text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-400/50 hover:scale-105 active:scale-90 transition-all z-40 px-0 cursor-pointer">
                    <span className="material-symbols-rounded text-3xl font-light">mic</span>
                </button>
            </main>

            <footer className="ios-safe-bottom px-8 py-8 mt-auto flex items-center justify-start bg-[#F8FAFF]">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-400">
                    <span className="material-symbols-rounded text-[16px]">link</span>
                    <span>Linked to:</span>
                    <a className="text-indigo-500 hover:text-indigo-700 decoration-indigo-200/50 underline underline-offset-4" href="#">rmd.ac.in</a>
                </div>
            </footer>

            {/* Resize Handle */}
            <div
                onMouseDown={handleResizeDown}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 0 20px 20px',
                    borderColor: 'transparent transparent #3b82f6 transparent',
                    cursor: 'nwse-resize',
                    zIndex: 100,
                    pointerEvents: 'auto'
                }}
            />
        </div>
    );
};

export default FloatingPanel;
