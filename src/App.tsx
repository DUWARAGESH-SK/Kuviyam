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
    <div className="w-[420px] h-[600px] flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Kuviyam</h1>
          <button
            onClick={handleOpenPanel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Open Floating Panel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="What's on your mind?"
            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tag Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!selectedTag
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📋 All
          </button>
          {allTags.slice(0, 3).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tag === selectedTag
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="px-5 py-2 bg-blue-50 border-l-4 border-blue-500 text-sm text-blue-700">
          {statusMsg}
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-5 pb-20">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="mb-2">No notes yet</p>
            <button onClick={handleCreateNote} className="text-blue-500 text-sm hover:underline">
              Create your first note
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Recent Notes</h2>
              <button className="text-xs text-gray-400 hover:text-gray-600">SEE ALL</button>
            </div>

            {filteredNotes.slice(0, 5).map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="group p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-200"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">📝</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
                      {note.title || 'Untitled'}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {note.content || 'No content'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                      {note.tags[0] && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {note.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        <button className="flex flex-col items-center gap-1 text-yellow-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
          </svg>
          <span className="text-xs font-medium">Notes</span>
        </button>

        <button
          onClick={handleCreateNote}
          className="w-14 h-14 -mt-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <button className="flex flex-col items-center gap-1 text-gray-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
          </svg>
          <span className="text-xs font-medium">Setup</span>
        </button>
      </div>
    </div>
  );
}

export default App;
