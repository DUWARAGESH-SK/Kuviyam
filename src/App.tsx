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

  const handleTogglePanel = async () => {
    setStatusMsg("Opening...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatusMsg("Error: No Active Tab");
        return;
      }

      const tabId = tab.id;
      const url = tab.url || '';

      // 1. Check for Restricted URLs
      if (url.startsWith('edge://') || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
        setStatusMsg("Cannot run on internal pages.");
        return;
      }

      // 2. Try sending message (Happy Path)
      try {
        await chrome.tabs.sendMessage(tabId, { action: "toggle-panel" });
        window.close();
      } catch (err) {
        console.log("Not ready, injecting...", err);

        // 3. Fallback: Force Inject
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content.js']
          });

          // Wait slightly longer for React hydration in content script
          setStatusMsg("Injecting...");
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tabId, { action: "toggle-panel" });
              window.close();
            } catch (retryErr) {
              // Last resort: Just tell them to refresh if it's truly stuck
              console.error(retryErr);
              setStatusMsg("Failed. Please Refresh Page.");
            }
          }, 1000);

        } catch (injectionErr: any) {
          console.error(injectionErr);
          if (injectionErr?.message?.includes('cannot be scripted')) {
            setStatusMsg("Page restriction preventing access.");
          } else {
            setStatusMsg("Injection Failed. Retry.");
          }
        }
      }
    } catch (e) {
      console.error(e);
      setStatusMsg("Error. Try Refreshing.");
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

  return (
    <div className="w-[400px] h-[500px] flex flex-col bg-tokyo-bg text-tokyo-fg overflow-hidden">
      <header className="p-4 border-b border-white/5 bg-tokyo-bg/50 backdrop-blur-sm z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-tokyo-accent tracking-tight">Kuviyam</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePanel}
              className="px-2 py-1 text-xs bg-tokyo-card border border-tokyo-accent/30 rounded hover:bg-tokyo-accent hover:text-tokyo-bg transition-colors flex items-center gap-1"
              title="Open Persistent Floating Panel (Alt+Shift+P)"
            >
              <span>📌 Open Panel</span>
            </button>

            {view === 'list' && (
              <button
                onClick={handleCreateNote}
                className="w-8 h-8 rounded-full bg-tokyo-accent text-tokyo-bg flex items-center justify-center hover:scale-105 transition-transform font-bold"
              >
                +
              </button>
            )}
          </div>
        </div>

        {statusMsg && <div className="text-xs text-tokyo-warning text-center animate-pulse font-mono bg-black/20 p-1 rounded border border-tokyo-warning/20">{statusMsg}</div>}

        {view === 'list' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full bg-tokyo-card px-3 py-1.5 rounded text-sm outline-none focus:ring-1 ring-tokyo-accent/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`text-xs px-2 py-0.5 rounded whitespace-nowrap transition-colors ${!selectedTag ? 'bg-tokyo-accent text-tokyo-bg font-bold' : 'bg-tokyo-card text-tokyo-fg hover:bg-white/10'}`}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`text-xs px-2 py-0.5 rounded whitespace-nowrap transition-colors ${tag === selectedTag ? 'bg-tokyo-accent text-tokyo-bg font-bold' : 'bg-tokyo-card text-tokyo-fg hover:bg-white/10'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {view === 'list' ? (
          notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-tokyo-fg/40 space-y-2">
              <p>No notes found.</p>
              <button onClick={handleCreateNote} className="text-tokyo-accent text-sm hover:underline">Create a note</button>
            </div>
          ) : (
            <div className="space-y-6">
              {siteNotes.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-tokyo-fg/50 uppercase tracking-wider mb-2">
                    {currentDomain ? `Current Site (${currentDomain})` : 'Contextual Notes'}
                  </h2>
                  <div className="space-y-3">
                    {siteNotes.map(note => (
                      <NoteCard key={note.id} note={note} onClick={handleEditNote} onDelete={handleDeleteNote} />
                    ))}
                  </div>
                </div>
              )}

              {otherNotes.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-tokyo-fg/50 uppercase tracking-wider mb-2">
                    {siteNotes.length > 0 ? 'Other Notes' : 'Recent Notes'}
                  </h2>
                  <div className="space-y-3">
                    {otherNotes.map(note => (
                      <NoteCard key={note.id} note={note} onClick={handleEditNote} onDelete={handleDeleteNote} />
                    ))}
                  </div>
                </div>
              )}

              {filteredNotes.length === 0 && (
                <div className="text-center text-tokyo-fg/40 py-8 text-sm">
                  No matches found.
                </div>
              )}
            </div>
          )
        ) : (
          <NoteEditor
            initialNote={editingNote}
            onSave={handleSaveNote}
            onCancel={() => setView('list')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
