import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';

interface StickyNotesProps {
    onClose: () => void;
}

// SVG Icons — no dependency on any icon font
const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SaveIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const TagIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);

const LinkIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const FolderIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

const MoonIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SunIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const StickyNotes: React.FC<StickyNotesProps> = ({ onClose }) => {
    // --- STATE ---
    const [position, setPosition] = useState({ x: 60, y: 60 });
    const [size, setSize] = useState({ width: 400, height: 520 });
    const [layout, setLayout] = useState({ x: 60, y: 60, width: 400, height: 520, isMinimized: false, isOpen: true });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDir, setResizeDir] = useState<string>('');
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaved, setIsSaved] = useState(true);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isPinned, setIsPinned] = useState(false);
    const [folderIds, setFolderIds] = useState<string[]>([]);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Hover states
    const [hoverClose, setHoverClose] = useState(false);
    const [hoverSave, setHoverSave] = useState(false);
    const [hoverTagAdd, setHoverTagAdd] = useState(false);
    const [focusTitle, setFocusTitle] = useState(false);
    const [focusContent, setFocusContent] = useState(false);
    const [hoverTheme, setHoverTheme] = useState(false);
    const [hoverPin, setHoverPin] = useState(false);
    const [hoverFolder, setHoverFolder] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    const [folders, setFolders] = useState<{ id: string, name: string }[]>([]);
    useEffect(() => {
        if (isFolderModalOpen) {
            storage.getFolders().then(f => setFolders(f));
        }
    }, [isFolderModalOpen]);

    // --- LOAD SAVED DATA ---
    useEffect(() => {
        storage.getPanelLayout().then((l) => {
            if (l) {
                setLayout(l);
                setPosition({ x: l.x, y: l.y });
                setSize({ width: l.width, height: l.height });
            }
        });
        chrome.storage.local.get(['panelDraft']).then((res) => {
            const draft = res.panelDraft as any;
            if (draft) {
                setTitle(draft.title || '');
                setContent(draft.content || '');
                setTags(draft.tags || []);
                setIsPinned(draft.pinned || false);
                setFolderIds(draft.folderIds || []);
            }
        });
        setTimeout(() => titleRef.current?.focus(), 100);
    }, []);

    // --- AUTO-SAVE DRAFT ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isSaved) {
                chrome.storage.local.set({ panelDraft: { title, content, tags, pinned: isPinned, folderIds, updatedAt: Date.now() } });
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [title, content, tags, isPinned, folderIds, isSaved]);

    // --- FORMATTED DATE ---
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const domain = (() => {
        try { return window.location.hostname || 'kuviyam'; } catch { return 'kuviyam'; }
    })();

    // --- DRAG ---
    const handleDragStart = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('textarea') || target.closest('input')) return;
        e.preventDefault();
        setIsDragging(true);
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    // --- RESIZE ---
    const handleResizeStart = (e: React.MouseEvent, dir: string) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeDir(dir);
        setResizeStart({ x: e.clientX, y: e.clientY, width: size.width, height: size.height, posX: position.x, posY: position.y });
    };

    // --- MOUSE MOVE/UP ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.max(0, e.clientX - dragOffset.x);
                const newY = Math.max(0, e.clientY - dragOffset.y);
                setPosition({ x: newX, y: newY });
            } else if (isResizing) {
                const dx = e.clientX - resizeStart.x;
                const dy = e.clientY - resizeStart.y;
                let newW = resizeStart.width;
                let newH = resizeStart.height;
                let newX = resizeStart.posX;
                let newY = resizeStart.posY;

                if (resizeDir.includes('e')) newW = Math.max(260, resizeStart.width + dx);
                if (resizeDir.includes('s')) newH = Math.max(300, resizeStart.height + dy);
                if (resizeDir.includes('w')) {
                    newW = Math.max(260, resizeStart.width - dx);
                    newX = resizeStart.posX + (resizeStart.width - newW);
                }
                if (resizeDir.includes('n')) {
                    newH = Math.max(300, resizeStart.height - dy);
                    newY = resizeStart.posY + (resizeStart.height - newH);
                }
                setSize({ width: newW, height: newH });
                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                storage.savePanelLayout({ ...layout, x: position.x, y: position.y });
            }
            if (isResizing) {
                setIsResizing(false);
                setResizeDir('');
                storage.savePanelLayout({ ...layout, x: position.x, y: position.y, width: size.width, height: size.height });
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
    }, [isDragging, isResizing, dragOffset, resizeStart, resizeDir, layout, position, size]);

    // --- SAVE ---
    const handleSave = async () => {
        let finalTags = [...tags];
        const pendingTag = tagInput.trim().replace(/^#/, '');
        if (pendingTag && !finalTags.includes(pendingTag)) {
            finalTags.push(pendingTag);
        }

        const newNote = {
            title: title.trim() || 'Untitled',
            content,
            tags: finalTags,
            pinned: isPinned,
            domain,
            url: (() => { try { return window.location.href; } catch { return ''; } })(),
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
            folderIds: folderIds
        };
        await storage.createNote(newNote);
        chrome.storage.local.set({ panelDraft: { title: '', content: '', tags: [], pinned: false, folderIds: [], updatedAt: Date.now() } });
        setIsSaved(true);
        setShowSavedToast(true);
        setTitle('');
        setContent('');
        setTags([]);
        setTagInput('');
        setIsPinned(false);
        setFolderIds([]);
        setTimeout(() => setShowSavedToast(false), 2500);
    };

    // --- TAG HANDLING ---
    const addTag = () => {
        const trimmed = tagInput.trim().replace(/^#/, '');
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setIsSaved(false);
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
        setIsSaved(false);
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
        if (e.key === 'Backspace' && !tagInput && tags.length) {
            setTags(tags.slice(0, -1));
            setIsSaved(false);
        }
    };

    // ─── INLINE STYLES ───────────────────────────────────────────────────────
    const S = {
        panel: {
            position: 'fixed' as const,
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            minWidth: '260px',
            minHeight: '300px',
            zIndex: 2147483647,
            display: 'flex',
            flexDirection: 'column' as const,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 32px 64px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
            background: isDarkMode ? 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            cursor: isDragging ? 'grabbing' : 'default',
            userSelect: isDragging ? 'none' as const : 'text' as const,
        },

        // Gradient accent bar at top
        accentBar: {
            height: '3px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #c4b5fd)',
            flexShrink: 0,
        },

        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.05)',
            cursor: 'grab',
            flexShrink: 0,
            gap: '12px',
        },

        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            minWidth: 0,
        },

        logo: {
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        },

        logoText: {
            fontSize: '14px',
            fontWeight: '800',
            color: '#fff',
            letterSpacing: '-0.5px',
        },

        headerTitle: {
            fontSize: '13px',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },

        headerActions: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
        },

        saveBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            background: hoverSave
                ? 'linear-gradient(135deg, #5558ea, #7c3aed)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontWeight: '600',
            fontSize: '13px',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            boxShadow: hoverSave
                ? '0 6px 20px rgba(99,102,241,0.6)'
                : '0 4px 14px rgba(99,102,241,0.4)',
            transition: 'all 0.15s ease',
            transform: hoverSave ? 'translateY(-1px)' : 'none',
            whiteSpace: 'nowrap' as const,
            minWidth: 0,
            minHeight: 0,
        },

        iconBtn: (isHovered: boolean) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            border: 'none',
            background: isHovered ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
            color: isHovered ? (isDarkMode ? '#fff' : '#000') : (isDarkMode ? '#cbd5e1' : '#475569'),
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            padding: 0,
            position: 'relative' as const,
        }),

        closeBtn: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            border: 'none',
            background: hoverClose ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: hoverClose ? '#f87171' : (isDarkMode ? '#64748b' : '#94a3b8'),
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            padding: 0,
            minWidth: 0,
            minHeight: 0,
        },

        body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column' as const,
            overflow: 'hidden',
            position: 'relative' as const,
        },

        scrollArea: {
            flex: 1,
            overflowY: 'auto' as const,
            padding: '20px 22px 12px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '4px',
        },

        dateLine: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
        },

        dateText: {
            fontSize: '10px',
            fontWeight: '600',
            color: '#475569',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
        },

        dateDot: {
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: '#334155',
        },

        domainPill: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '9999px',
            fontSize: '10px',
            fontWeight: '500',
            color: '#818cf8',
            marginBottom: '18px',
            width: 'fit-content',
        },

        titleInput: {
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '22px',
            fontWeight: '700',
            color: focusTitle ? (isDarkMode ? '#f1f5f9' : '#0f172a') : (isDarkMode ? '#e2e8f0' : '#334155'),
            letterSpacing: '-0.3px',
            lineHeight: '1.3',
            padding: '0',
            marginBottom: '4px',
            fontFamily: 'inherit',
            caretColor: '#818cf8',
            transition: 'color 0.15s',
        },

        titleUnderline: {
            height: '1px',
            background: focusTitle
                ? 'linear-gradient(90deg, #6366f1, transparent)'
                : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
            marginBottom: '16px',
            transition: 'background 0.3s',
            borderRadius: '1px',
        },

        sectionLabel: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: '600',
            color: '#475569',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            marginBottom: '8px',
        },

        tagRow: {
            display: 'flex',
            flexWrap: 'wrap' as const,
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            marginBottom: '16px',
            minHeight: '38px',
        },

        tagChip: (tag: string) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: '500',
            color: '#a5b4fc',
            cursor: 'default',
        }),

        tagX: {
            cursor: 'pointer',
            color: '#6366f1',
            fontSize: '12px',
            lineHeight: '1',
            padding: '0 0 0 2px',
            background: 'none',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            fontWeight: '700',
            minWidth: 0,
            minHeight: 0,
        },

        tagInput: {
            flex: 1,
            minWidth: '80px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '12px',
            color: '#94a3b8',
            fontFamily: 'inherit',
            padding: '2px 0',
        },

        textarea: {
            flex: 1,
            width: '100%',
            background: focusContent ? (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
            border: focusContent ? '1px solid rgba(99,102,241,0.25)' : (isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'),
            borderRadius: '10px',
            outline: 'none',
            fontSize: '14px',
            lineHeight: '1.7',
            color: isDarkMode ? '#cbd5e1' : '#334155',
            padding: '12px 14px',
            resize: 'none' as const,
            minHeight: '120px',
            fontFamily: 'inherit',
            caretColor: '#818cf8',
            transition: 'all 0.2s',
        },

        footer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 22px 10px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
        },

        footerHint: {
            fontSize: '10px',
            color: '#334155',
            letterSpacing: '0.05em',
        },

        statusDot: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            color: isSaved ? '#22c55e' : '#f59e0b',
        },

        statusDotIndicator: {
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isSaved ? '#22c55e' : '#f59e0b',
            boxShadow: isSaved ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px rgba(245,158,11,0.5)',
        },

        // Corner resize handles
        resizeHandle: (dir: string) => {
            const base: React.CSSProperties = {
                position: 'absolute' as const,
                zIndex: 10,
            };
            const map: Record<string, React.CSSProperties> = {
                'nw': { top: 0, left: 0, width: 12, height: 12, cursor: 'nw-resize' },
                'n': { top: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 6, cursor: 'n-resize' },
                'ne': { top: 0, right: 0, width: 12, height: 12, cursor: 'ne-resize' },
                'e': { top: '50%', right: 0, transform: 'translateY(-50%)', width: 6, height: 40, cursor: 'e-resize' },
                'se': { bottom: 0, right: 0, width: 16, height: 16, cursor: 'se-resize' },
                's': { bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 6, cursor: 's-resize' },
                'sw': { bottom: 0, left: 0, width: 12, height: 12, cursor: 'sw-resize' },
                'w': { top: '50%', left: 0, transform: 'translateY(-50%)', width: 6, height: 40, cursor: 'w-resize' },
            };
            return { ...base, ...map[dir] };
        },

        // Toast notification
        toast: {
            position: 'absolute' as const,
            bottom: '54px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 10,
            whiteSpace: 'nowrap' as const,
            animation: 'fadeInUp 0.25s ease',
        },

        // SE resize grip visual
        seGrip: {
            position: 'absolute' as const,
            bottom: '6px',
            right: '6px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2px',
            opacity: 0.3,
            pointerEvents: 'none' as const,
        },

        folderPicker: {
            position: 'absolute' as const,
            top: '55px',
            right: '20px',
            width: '200px',
            background: isDarkMode ? '#1e293b' : '#fff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 100,
            display: isFolderModalOpen ? 'block' : 'none',
        },
        folderItem: (selected: boolean) => ({
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: selected ? '#818cf8' : (isDarkMode ? '#e2e8f0' : '#1e293b'),
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: selected ? '600' : '400',
        }),
    };

    return (
        <div ref={containerRef} style={S.panel}>
            {/* Resize handles — all 8 directions */}
            {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map(dir => (
                <div
                    key={dir}
                    style={S.resizeHandle(dir)}
                    onMouseDown={(e) => handleResizeStart(e, dir)}
                />
            ))}

            {/* Top accent gradient bar */}
            <div style={S.accentBar} />

            {/* Header */}
            <div style={S.header} onMouseDown={handleDragStart}>
                <div style={S.headerLeft}>
                    <img src={chrome.runtime.getURL('logo.png')} alt="Kuviyam" style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.5)', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover' }} />
                    <span style={{...S.headerTitle, fontSize: '18px', paddingLeft: '4px'}}>Floating Panel</span>
                </div>
                <div style={S.headerActions}>
                    {!isSaved && (
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '500', whiteSpace: 'nowrap' as const }}>
                            Unsaved…
                        </span>
                    )}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        style={S.iconBtn(hoverTheme)}
                        onMouseEnter={() => setHoverTheme(true)}
                        onMouseLeave={() => setHoverTheme(false)}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <SunIcon /> : <MoonIcon />}
                    </button>
                    <button
                        onClick={() => { setIsPinned(!isPinned); setIsSaved(false); }}
                        style={{ ...S.iconBtn(hoverPin), ...(isPinned ? { color: '#ef4444' } : {}) }}
                        onMouseEnter={() => setHoverPin(true)}
                        onMouseLeave={() => setHoverPin(false)}
                        title={isPinned ? "Unpin Note" : "Pin Note"}
                    >
                        <HeartIcon filled={isPinned} />
                    </button>
                    <button
                        onClick={() => setIsFolderModalOpen(!isFolderModalOpen)}
                        style={{ ...S.iconBtn(hoverFolder), ...(folderIds.length > 0 ? { color: '#818cf8' } : {}) }}
                        onMouseEnter={() => setHoverFolder(true)}
                        onMouseLeave={() => setHoverFolder(false)}
                        title="Folders"
                    >
                        <FolderIcon />
                        {folderIds.length > 0 && (
                            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', background: '#818cf8', borderRadius: '50%' }} />
                        )}
                    </button>
                    <div style={{ width: '1px', height: '16px', background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '0 4px' }} />
                    <button
                        onClick={handleSave}
                        style={S.saveBtn}
                        onMouseEnter={() => setHoverSave(true)}
                        onMouseLeave={() => setHoverSave(false)}
                    >
                        <SaveIcon />
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        style={S.closeBtn}
                        onMouseEnter={() => setHoverClose(true)}
                        onMouseLeave={() => setHoverClose(false)}
                        title="Close"
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>

            {/* Folder Dropdown */}
            {isFolderModalOpen && (
                <div style={S.folderPicker}>
                    <div style={{ padding: '4px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>SELECT FOLDERS</div>
                    {folders.length === 0 ? (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#64748b' }}>No folders found</div>
                    ) : (
                        folders.map(f => (
                            <div
                                key={f.id}
                                style={S.folderItem(folderIds.includes(f.id))}
                                onClick={() => {
                                    setFolderIds(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]);
                                    setIsSaved(false);
                                }}
                            >
                                <FolderIcon />
                                {f.name}
                            </div>
                        ))
                    )}
                    <div style={{ padding: '8px 4px 4px 4px', borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', marginTop: '4px' }}>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (newFolderName.trim()) {
                                await storage.createFolder(newFolderName.trim());
                                const fs = await storage.getFolders();
                                setFolders(fs);
                                setNewFolderName('');
                            }
                        }} style={{ display: 'flex', gap: '4px' }}>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder..."
                                style={{
                                    flex: 1,
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                    fontSize: '12px',
                                    outline: 'none',
                                    minWidth: 0
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0 10px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Add
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Body */}
            <div style={S.body}>
                <div style={S.scrollArea}>

                    {/* Date & Domain */}
                    <div style={S.dateLine}>
                        <span style={S.dateText}>{formattedDate}</span>
                    </div>
                    <div style={S.domainPill}>
                        <LinkIcon />
                        {domain}
                    </div>

                    {/* Title */}
                    <input
                        ref={titleRef}
                        type="text"
                        placeholder="Note title…"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setIsSaved(false); }}
                        onFocus={() => setFocusTitle(true)}
                        onBlur={() => setFocusTitle(false)}
                        style={S.titleInput}
                    />
                    <div style={S.titleUnderline} />

                    {/* Tags Section */}
                    <div style={S.sectionLabel}>
                        <TagIcon />
                        Tags
                    </div>
                    <div style={S.tagRow}>
                        {tags.map(tag => (
                            <span key={tag} style={S.tagChip(tag)}>
                                #{tag}
                                <button
                                    style={S.tagX}
                                    onClick={() => removeTag(tag)}
                                    title={`Remove #${tag}`}
                                >×</button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder={tags.length === 0 ? 'Add tag…' : '+'}
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={addTag}
                            style={S.tagInput}
                        />
                    </div>

                    {/* Content */}
                    <div style={S.sectionLabel}>
                        <span style={{ fontSize: '10px' }}>✦</span>
                        Content
                    </div>
                    <textarea
                        placeholder="Write something amazing…"
                        value={content}
                        onChange={(e) => { setContent(e.target.value); setIsSaved(false); }}
                        onFocus={() => setFocusContent(true)}
                        onBlur={() => setFocusContent(false)}
                        style={S.textarea}
                    />
                </div>

                {/* Footer */}
                <div style={S.footer}>
                    <span style={S.footerHint}>Press Enter to add tags · Drag to move</span>
                    <span style={S.statusDot}>
                        <span style={S.statusDotIndicator} />
                        {isSaved ? 'Saved' : 'Editing'}
                    </span>
                </div>

                {/* SE resize grip visual indicator */}
                <div style={S.seGrip}>
                    {[0, 1, 2].map(r => (
                        <div key={r} style={{ display: 'flex', gap: '2px' }}>
                            {Array(3 - r).fill(0).map((_, i) => (
                                <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#94a3b8' }} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Saved toast */}
            {showSavedToast && (
                <div style={S.toast}>
                    <CheckIcon />
                    Note saved!
                </div>
            )}
        </div>
    );
};

export default StickyNotes;
