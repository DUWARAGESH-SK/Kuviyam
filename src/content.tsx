import { createRoot } from 'react-dom/client';
import type { Note, NoteDraft, PanelLayout } from './types';
import { storage } from './utils/storage';
import { FloatingPanel } from './components/FloatingPanel';

// Create container for floating notes
const container = document.createElement('div');
container.id = 'kuviyam-root';
document.body.appendChild(container);

// Use Shadow DOM
const shadowRoot = container.attachShadow({ mode: 'open' });
const root = createRoot(shadowRoot);

const style = document.createElement('style');
style.textContent = `
  :host { 
    all: initial; 
    font-family: sans-serif; 
    z-index: 2147483647; 
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 100vw; 
    height: 100vh; 
    pointer-events: none;
  }
  * { box-sizing: border-box; }
`;
shadowRoot.appendChild(style);

async function init() {
    const layout = await storage.getPanelLayout();
    const notes = await storage.getNotes();
    let scratchpad = notes.find(n => n.id === 'global-scratchpad');

    if (!scratchpad) {
        scratchpad = await storage.createNote({
            title: 'Global Scratchpad',
            content: '',
            tags: ['scratchpad'],
            pinned: true
        });
        scratchpad.id = 'global-scratchpad';
        await storage.saveNote(scratchpad);

        // Force layout to be visible and open on first run
        if (!layout.isOpen) {
            layout.isOpen = true;
            layout.isMinimized = false;
            layout.x = window.innerWidth - 350; // Default right side
            layout.y = 50;
            await storage.savePanelLayout(layout);
        }
    }

    renderPanel(layout, scratchpad);
}

function renderPanel(layout: PanelLayout, note: Note) {
    const handleLayoutChange = async (newLayout: PanelLayout) => {
        await storage.savePanelLayout(newLayout);
    };

    const handleSaveNote = async (draft: NoteDraft, id?: string) => {
        const updatedNote: Note = {
            ...note,
            ...draft,
            id: 'global-scratchpad',
            updatedAt: Date.now()
        };
        await storage.saveNote(updatedNote);
    };

    root.render(
        <FloatingPanel
            initialLayout={layout}
            onLayoutChange={handleLayoutChange}
            note={note}
            onSaveNote={handleSaveNote}
        />
    );
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.panelLayout || changes.notes) {
            init();
        }
    }
});

init();
