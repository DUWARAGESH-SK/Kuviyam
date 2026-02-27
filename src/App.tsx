import { useState, useEffect, useMemo } from 'react';
import type { Note, NoteDraft } from './types';
import { storage } from './utils/storage';
import { NoteEditor } from './components/NoteEditor';
import { TagBar } from './components/TagBar';
import { TagModal } from './components/TagModal';
import { FoldersPanel } from './components/FoldersPanel';
import { FolderSelectionModal } from './components/FolderSelectionModal';
import { SettingsPage } from './components/SettingsPage';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'favorites' | 'folders' | 'settings'>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isDark, setIsDark] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Folder Selection Modal State
  const [isFolderSelectOpen, setIsFolderSelectOpen] = useState(false);
  const [noteForFolderSelect, setNoteForFolderSelect] = useState<Note | null>(null);
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
    const closeMenu = () => setActiveMenuNoteId(null);
    document.addEventListener('click', closeMenu);

    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        try {
          setCurrentDomain(new URL(tab.url).hostname);
        } catch (e) { /* ignore */ }
      }
    });

    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const loadNotes = async () => {
    const loadedNotes = await storage.getNotes();
    setNotes(loadedNotes);
  };

  const handleOpenPanel = async () => {
    setStatusMsg("Opening...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        setStatusMsg("No active tab.");
        return;
      }

      const url = tab.url || "";
      if (url.startsWith("edge://") || url.startsWith("chrome://") || url.startsWith("about:") || url.startsWith("chrome-extension:") || url.includes("chrome.google.com/webstore")) {
        setStatusMsg("Can't open on this page.");
        setTimeout(() => setStatusMsg(""), 3000);
        return;
      }

      const tabId = tab.id;

      try {
        await chrome.tabs.sendMessage(tabId, { type: "KUV_OPEN_PANEL" });
        window.close();
      } catch (err: any) {
        const msg = err?.message || String(err);
        setStatusMsg("Edge Err: " + msg.substring(0, 30));
        setTimeout(() => setStatusMsg(""), 4000);
      }

    } catch (e) {
      setStatusMsg("Error.");
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const tagStats = useMemo(() => {
    const stats: Record<string, { name: string; count: number; lastUsed: number }> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        if (!stats[tag]) {
          stats[tag] = { name: tag, count: 0, lastUsed: 0 };
        }
        stats[tag].count++;
        stats[tag].lastUsed = Math.max(stats[tag].lastUsed, note.updatedAt);
      });
    });
    return Object.values(stats).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [notes]);

  const topTags = tagStats.slice(0, 5); // Show top 5 tags in the bar

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
    const matchesView = view === 'favorites' ? n.pinned : true;
    return matchesSearch && matchesTag && matchesView;
  });

  const handleCreateNote = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setEditingNote({
      id: '',
      title: tab?.title || '',
      content: '',
      createdAt: 0,
      updatedAt: Date.now(),
      tags: [],
      url: tab?.url,
      domain: tab?.url ? new URL(tab.url).hostname : undefined,
      pinned: false
    } as Note);
    setView('edit');
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setView('edit');
  };

  const handleSaveNote = async (draft: NoteDraft, id?: string) => {
    if (id) {
      const updatedNote: Note = { ...editingNote!, ...draft, updatedAt: Date.now() };
      await storage.saveNote(updatedNote);
    } else {
      await storage.createNote(draft);
    }
    await loadNotes();
    setView('list');
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      await storage.deleteNote(id);
      await loadNotes();
    }
  };

  const handleDeleteAll = async () => {
    await chrome.storage.local.clear();
    setNotes([]);
    setEditingNote(null);
    setCurrentDomain('');
    setStatusMsg('All data deleted');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleMenuClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setActiveMenuNoteId(activeMenuNoteId === noteId ? null : noteId);
  }

  const handleAddToFolderClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteForFolderSelect(note);
    setIsFolderSelectOpen(true);
    setActiveMenuNoteId(null);
  }

  const handleFolderSave = async (folderIds: string[]) => {
    if (noteForFolderSelect) {
      const updatedNote = { ...noteForFolderSelect, folderIds, updatedAt: Date.now() };
      await storage.saveNote(updatedNote);
      await loadNotes();
      setNoteForFolderSelect(null);
    }
  }

  if (view === 'edit') {
    return (
      <div className="w-[450px] min-h-[884px] bg-white text-slate-800 dark:bg-background-dark dark:text-slate-100 font-display">
        <NoteEditor
          initialNote={editingNote}
          onSave={handleSaveNote}
          onCancel={() => setView(view === 'edit' ? 'list' : view)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>
    );
  }

  if (view === 'folders') {
    return (
      <div className="w-[450px] min-h-[884px] font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 overflow-x-hidden relative flex flex-col">
        <FoldersPanel onEditNote={handleEditNote} />

        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl ios-tab-shadow px-6 pb-8 pt-4 z-50">
          <div className="max-w-md mx-auto relative flex justify-between items-center">
            <button
              onClick={() => setView('list')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">sticky_note_2</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Notes</span>
            </button>
            <button
              onClick={() => setView('favorites')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">favorite</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Favorites</span>
            </button>
            <div className="w-16"></div>
            <button
              onClick={() => setView('folders')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-primary"
            >
              <span className="material-symbols-rounded">folder</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Folders</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">settings</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Settings</span>
            </button>
            {/* Floating Action Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-12">
              <button
                onClick={handleCreateNote}
                className="w-16 h-16 bg-primary rounded-full floating-action-button flex items-center justify-center text-slate-900 transform active:scale-90 transition-transform duration-100 border-4 border-white dark:border-slate-900 px-0 cursor-pointer"
              >
                <span className="material-symbols-rounded text-3xl font-bold">add</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="w-[450px] min-h-[884px] font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 overflow-x-hidden relative flex flex-col">
        <SettingsPage onDeleteAll={handleDeleteAll} />

        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl ios-tab-shadow px-6 pb-8 pt-4 z-50">
          <div className="max-w-md mx-auto relative flex justify-between items-center">
            <button
              onClick={() => setView('list')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">sticky_note_2</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Notes</span>
            </button>
            <button
              onClick={() => setView('favorites')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">favorite</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Favorites</span>
            </button>
            <div className="w-16"></div>
            <button
              onClick={() => setView('folders')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
            >
              <span className="material-symbols-rounded">folder</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Folders</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-primary"
            >
              <span className="material-symbols-rounded">settings</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Settings</span>
            </button>
            {/* Floating Action Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-12">
              <button
                onClick={handleCreateNote}
                className="w-16 h-16 bg-primary rounded-full floating-action-button flex items-center justify-center text-slate-900 transform active:scale-90 transition-transform duration-100 border-4 border-white dark:border-slate-900 px-0 cursor-pointer"
              >
                <span className="material-symbols-rounded text-3xl font-bold">add</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    );
  }


  return (
    <div className="w-[450px] min-h-[884px] font-display bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 overflow-x-hidden relative">
      <main className="relative z-10 px-6 pt-12 pb-32">
        {/* Doodles Overlay */}
        <div className="doodle-bg-header">
          <img alt="" className="doodle-item w-12 h-12 top-4 left-4 rotate-[-15deg] opacity-20 dark:invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAan07EU_iOBiMZhanxFWddp37GN-vIVLcNt268lhAzDPubTohpjSMaYLD_ivBEKqcJLyDcG0c18M1gGcgZHqh4NTsXhNDy-Phpg3OTgLxLHJXgX5Mb_ft2qMfWYWTG45PUFRxJExIuYFiCEVYCbTqSEx2Mq6-vIEHzh-PTXBgLVaQuBGtZ8LdjHqrJOQnwzB9AnptIBtmZ0MSOVbStj6W3g6Z5R-U-XwuZbTrw1oqCDFT99vl2UsJHbL_3crL6KCfOaSJPJfMNZGmi" />
          <img alt="" className="doodle-item w-16 h-16 top-16 right-32 rotate-[45deg] opacity-10 dark:invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1WSXShbf8w3oUi_6ZSIgYma_AnH62ay9ea-RyLnK5JCfwAfE1g94P50Ff0cuwBWPkvmDLMQ-I41-kGT0CIxKlvgTm2dI5ZvDzEmkk0_IrETckmkqDetuDU1oOQ4DWIRJIj50SpNJUkwRdZsCd8ReE6ZPD0HZtsGI48RNeXevK7s2P6QTWwZk2nRa4bbwUhlbqIYltBEUlwP5tb2GOVw9kLfU8i3EML6iHq-osaq5obJQosGTC2gzW_L_rBjviT-ZGvEu5Cebqq4zI" />
        </div>

        {/* Header */}
        <header className="relative flex justify-between items-start mb-8 z-10">
          <div>
            <p className="text-rose-500 font-bold text-sm mb-1 tracking-wide">Good Morning!</p>
            <h1 className="text-5xl font-extrabold text-[#1E293B] dark:text-white tracking-tight title-embossed">Kuviyam</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenPanel}
              className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform px-0 cursor-pointer"
              title="Open Persistent Panel"
            >
              <span className="material-symbols-rounded text-[22px]">filter_list</span>
            </button>
            <button
              onClick={toggleTheme}
              className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform px-0 cursor-pointer"
            >
              <span className="material-symbols-rounded text-[22px]">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform px-0 cursor-pointer">
              <span className="material-symbols-rounded text-[22px]">menu</span>
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
            <span className="material-symbols-rounded">search</span>
          </div>
          <input
            className="w-full h-14 pl-12 pr-12 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/50 text-slate-600 dark:text-slate-200"
            placeholder="What's on your mind?"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-4 flex items-center text-slate-400">
            <span className="material-symbols-rounded text-xl opacity-40">lightbulb</span>
          </div>
        </div>

        {/* Tag Filters */}
        <TagBar
          tags={topTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          onShowAll={() => setIsTagModalOpen(true)}
        />

        {/* Recent Notes */}
        <div className="mb-6 flex justify-between items-center px-1">
          <h2 className="text-xl font-extrabold text-[#1E293B] dark:text-white">
            {view === 'favorites' ? 'Favorite Notes' : 'Recent Notes'}
          </h2>
          <button className="text-slate-400 font-bold text-[10px] tracking-widest uppercase" onClick={() => { }}>See All</button>
        </div>

        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <p>No notes found.</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] shadow-sm border border-slate-50 dark:border-slate-700/50 flex items-center gap-4 transition-all hover:shadow-md cursor-pointer group relative"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${index % 3 === 0 ? 'bg-indigo-500' : index % 3 === 1 ? 'bg-orange-500' : 'bg-teal-500'
                  }`}>
                  <span className="material-symbols-rounded text-2xl">
                    {index % 3 === 0 ? 'description' : index % 3 === 1 ? 'edit_note' : 'auto_awesome'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{note.title || 'Untitled'}</h3>
                  <p className="text-slate-400 text-sm truncate">{note.content || 'No content...'}</p>
                  <p className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase mt-1">
                    <span>{new Date(note.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                    {note.folderIds && note.folderIds.length > 0 && (
                      <span className="text-primary flex items-center gap-0.5">
                        <span className="material-symbols-rounded text-[12px]">folder</span>
                        {note.folderIds.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => handleMenuClick(e, note.id)}
                    className="text-slate-300 hover:text-slate-500 dark:hover:text-white transition-colors px-0 cursor-pointer p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  >
                    <span className="material-symbols-rounded">more_vert</span>
                  </button>
                  {/* Dropdown Menu */}
                  {activeMenuNoteId === note.id && (
                    <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-scale-in origin-top-right">
                      <button
                        onClick={(e) => handleAddToFolderClick(e, note)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                      >
                        <span className="material-symbols-rounded text-slate-400 text-[20px]">drive_file_move</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Add to Folder</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-left transition-colors text-rose-500"
                      >
                        <span className="material-symbols-rounded text-[20px]">delete</span>
                        <span className="text-sm font-bold">Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl ios-tab-shadow px-6 pb-8 pt-4 z-50">
        <div className="max-w-md mx-auto relative flex justify-between items-center">
          <button
            onClick={() => setView('list')}
            className={`flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors ${view === 'list' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <span className="material-symbols-rounded">sticky_note_2</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Notes</span>
          </button>
          <button
            onClick={() => setView('favorites')}
            className={`flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors ${view === 'favorites' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <span className="material-symbols-rounded">favorite</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Favorites</span>
          </button>
          <div className="w-16"></div>
          <button
            onClick={() => setView('folders')}
            className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
          >
            <span className="material-symbols-rounded">folder</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Folders</span>
          </button>
          <button
            onClick={() => setView('settings')}
            className="flex flex-col items-center gap-1 group px-0 cursor-pointer transition-colors text-slate-400 dark:text-slate-500"
          >
            <span className="material-symbols-rounded">settings</span>
            <span className="text-[10px] font-bold tracking-wider uppercase">Settings</span>
          </button>
          {/* Floating Action Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12">
            <button
              onClick={handleCreateNote}
              className="w-16 h-16 bg-primary rounded-full floating-action-button flex items-center justify-center text-slate-900 transform active:scale-90 transition-transform duration-100 border-4 border-white dark:border-slate-900 px-0 cursor-pointer"
            >
              <span className="material-symbols-rounded text-3xl font-bold">add</span>
            </button>
          </div>
        </div>
      </nav>

      {statusMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-primary text-slate-900 rounded-full shadow-lg font-bold text-sm animate-fade-in">
          {statusMsg}
        </div>
      )}

      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        notes={notes}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
      />

      <FolderSelectionModal
        isOpen={isFolderSelectOpen}
        onClose={() => {
          setIsFolderSelectOpen(false);
          setNoteForFolderSelect(null);
        }}
        initialSelectedFolderIds={noteForFolderSelect?.folderIds || []}
        onSave={handleFolderSave}
      />
    </div>
  );
}

export default App;

