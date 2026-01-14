import { useState, useEffect } from 'react';
import type { Note, NoteDraft } from './types';
import { storage } from './utils/storage';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        try {
          setCurrentDomain(new URL(tab.url).hostname);
        } catch (e) { /* ignore */ }
      }
    });
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
      if (url.startsWith("edge://") || url.startsWith("chrome://")) {
        setStatusMsg("Restricted Page.");
        return;
      }

      const tabId = tab.id;

      try {
        await chrome.tabs.sendMessage(tabId, { type: "KUV_OPEN_PANEL" });
        window.close();
      } catch (err) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content.js']
          });

          setTimeout(async () => {
            await chrome.tabs.sendMessage(tabId, { type: "KUV_OPEN_PANEL" });
            window.close();
          }, 500);

        } catch (injectErr) {
          setStatusMsg("Failed. Refresh Page.");
        }
      }

    } catch (e) {
      setStatusMsg("Error.");
    }
  };

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  const filteredNotes = notes.filter(n => {
    const matchesSearch = (n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const siteNotes = currentDomain ? filteredNotes.filter(n => n.domain === currentDomain) : [];
  const otherNotes = currentDomain ? filteredNotes.filter(n => n.domain !== currentDomain) : filteredNotes;

  const handleCreateNote = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setEditingNote({
      id: '',
      title: tab?.title || '',
      content: '',
      createdAt: 0,
      updatedAt: 0,
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

  if (view === 'edit') {
    return (
      <div className="w-[420px] h-[600px] flex flex-col bg-white text-gray-900">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            ←
          </button>
          <h2 className="font-semibold text-gray-900">
            {editingNote?.id ? 'Edit Note' : 'New Note'}
          </h2>
        </div>
        <div className="flex-1 overflow-auto">
          <NoteEditor
            initialNote={editingNote}
            onSave={handleSaveNote}
            onCancel={() => setView('list')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-[450px] min-h-[600px] font-display bg-white text-slate-800 dark:bg-background-dark dark:text-slate-100 overflow-x-hidden relative flex flex-col">
      {/* Decorative Doodles Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] overflow-hidden">
        <img alt="" className="absolute w-24 h-24 top-10 -left-10 rotate-[-15deg] dark:invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAan07EU_iOBiMZhanxFWddp37GN-vIVLcNt268lhAzDPubTohpjSMaYLD_ivBEKqcJLyDcG0c18M1gGcgZHqh4NTsXhNDy-Phpg3OTgLxLHJXgX5Mb_ft2qMfWYWTG45PUFRxJExIuYFiCEVYCbTqSEx2Mq6-vIEHzh-PTXBgLVaQuBGtZ8LdjHqrJOQnwzB9AnptIBtmZ0MSOVbStj6W3g6Z5R-U-XwuZbTrw1oqCDFT99vl2UsJHbL_3crL6KCfOaSJPJfMNZGmi" />
        <img alt="" className="absolute w-32 h-32 bottom-20 -right-10 rotate-[45deg] dark:invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1WSXShbf8w3oUi_6ZSIgYma_AnH62ay9ea-RyLnK5JCfwAfE1g94P50Ff0cuwBWPkvmDLMQ-I41-kGT0CIxKlvgTm2dI5ZvDzEmkk0_IrETckmkqDetuDU1oOQ4DWIRJIj50SpNJUkwRdZsCd8ReE6ZPD0HZtsGI48RNeXevK7s2P6QTWwZk2nRa4bbwUhlbqIYltBEUlwP5tb2GOVw9kLfU8i3EML6iHq-osaq5obJQosGTC2gzW_L_rBjviT-ZGvEu5Cebqq4zI" />
      </div>

      <main className="relative z-10 flex-1 px-8 pt-10 pb-24">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <p className="text-rose-500 font-bold text-xs uppercase tracking-[0.2em] mb-1">Welcome back</p>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight title-embossed">Kuviyam</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenPanel}
              className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all active:scale-95"
              title="Open Persistent Panel"
            >
              <span className="material-symbols-rounded text-2xl font-light">grid_view</span>
            </button>
            <button className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all active:scale-95">
              <span className="material-symbols-rounded text-2xl font-light">more_horiz</span>
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-8 group">
          <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
            <span className="material-symbols-rounded text-[22px]">search</span>
          </div>
          <input
            className="w-full h-16 pl-14 pr-14 bg-slate-50 dark:bg-slate-900 border-none rounded-[2rem] shadow-inner text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/40 transition-all font-medium placeholder-slate-400"
            placeholder="Type your thoughts..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tag Filters */}
        <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedTag(null)}
            className={`flex items-center gap-2 px-8 py-4 font-bold rounded-2xl shadow-lg transition-all ${!selectedTag
              ? 'bg-primary text-slate-900 scale-105'
              : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/30'
              }`}
          >
            <span className="material-symbols-rounded text-lg">apps</span>
            All
          </button>
          <button
            onClick={() => setSelectedTag('Work')}
            className={`flex items-center gap-2 px-8 py-4 font-bold rounded-2xl shadow-lg transition-all ${selectedTag === 'Work'
              ? 'bg-primary text-slate-900 scale-105'
              : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/30'
              }`}
          >
            <span className="material-symbols-rounded text-lg">business_center</span>
            Work
          </button>
          <button
            onClick={() => setSelectedTag('Personal')}
            className={`flex items-center gap-2 px-8 py-4 font-bold rounded-2xl shadow-lg transition-all ${selectedTag === 'Personal'
              ? 'bg-primary text-slate-900 scale-105'
              : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/30'
              }`}
          >
            <span className="material-symbols-rounded text-lg">person</span>
            Personal
          </button>
        </div>

        {/* Recent Notes */}
        <div className="mb-6 flex justify-between items-end px-1">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Recent Notes</h2>
          <button className="text-primary font-bold text-xs uppercase tracking-widest hover:underline transition-all">Explore all</button>
        </div>

        <div className="space-y-5">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300 dark:text-slate-600">
              <span className="material-symbols-rounded text-6xl mb-4 opacity-20">library_books</span>
              <p className="font-semibold">Your notes will appear here</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="bg-white dark:bg-slate-800/50 p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 flex items-center gap-6 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800"
              >
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${index % 3 === 0 ? 'bg-indigo-500/90' : index % 3 === 1 ? 'bg-orange-500/90' : 'bg-emerald-500/90'
                  }`}>
                  <span className="material-symbols-rounded text-3xl font-light">
                    {index % 3 === 0 ? 'description' : index % 3 === 1 ? 'edit_note' : 'auto_awesome'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white truncate mb-1">{note.title || 'Untitled'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{note.content || 'No description...'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(note.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-rounded text-[28px]">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 px-8 pb-10 pt-5 z-50 rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto relative flex justify-between items-center">
          <button className="flex flex-col items-center gap-1.5 transition-all hover:scale-110 active:scale-90">
            <span className="material-symbols-rounded text-[32px] text-primary">note_alt</span>
            <span className="text-[10px] font-black text-primary tracking-widest uppercase">Notes</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 transition-all hover:scale-110 active:scale-90">
            <span className="material-symbols-rounded text-[32px] text-slate-300 dark:text-slate-600">star</span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Saved</span>
          </button>
          <div className="w-20"></div> {/* Space for FAB */}
          <button className="flex flex-col items-center gap-1.5 transition-all hover:scale-110 active:scale-90">
            <span className="material-symbols-rounded text-[32px] text-slate-300 dark:text-slate-600">vpn_key</span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Vault</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 transition-all hover:scale-110 active:scale-90">
            <span className="material-symbols-rounded text-[32px] text-slate-300 dark:text-slate-600">settings</span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase">Setup</span>
          </button>

          {/* Floating Action Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-16">
            <button
              onClick={handleCreateNote}
              className="w-20 h-20 bg-primary rounded-[2rem] shadow-[0_12px_40px_-5px_rgba(250,204,21,0.5)] flex items-center justify-center text-slate-900 transform active:scale-90 transition-all hover:scale-105 border-[6px] border-white dark:border-slate-900"
            >
              <span className="material-symbols-rounded text-4xl font-black">add</span>
            </button>
          </div>
        </div>
      </nav>

      {statusMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-slate-900 text-white dark:bg-primary dark:text-slate-900 rounded-full shadow-2xl font-bold text-sm animate-fade-in flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          {statusMsg}
        </div>
      )}
    </div>
  );
}

export default App;
