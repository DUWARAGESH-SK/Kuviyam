import { createRoot } from 'react-dom/client';
import type { Note, NoteDraft, PanelLayout } from './types';
import { storage } from './utils/storage';
import { FloatingPanel } from './components/FloatingPanel';

// --- Container Setup ---
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
    pointer-events: none; /* Let clicks pass through primarily */
  }
  * { box-sizing: border-box; }
`;
shadowRoot.appendChild(style);


// --- Core Logic ---
let isInit = false;

async function init() {
    // Prevent double-init loops if not careful, though harmless here
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
        // Force valid layout for new users
        if (!layout.isOpen) {
            layout.isOpen = true;
            layout.isMinimized = false;
            layout.x = window.innerWidth - 400;
            layout.y = 100;
            layout.width = 320;
            layout.height = 500;
            await storage.savePanelLayout(layout);
        }
        await storage.saveNote(scratchpad);
    }

    renderPanel(layout, scratchpad);
}

function renderPanel(layout: PanelLayout, note: Note) {
    const handleLayoutChange = async (newLayout: PanelLayout) => {
        // Optimistic UI update handled by component, we just save
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

// --- Persistence Listeners ---

// 1. Cross-Tab Sync (Remote)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.panelLayout || changes.notes) {
            init();
        }
    }
});

// 2. Tab Switching Sync (Local Wake-up)
// When user switches tabs, the content script might have been dormant.
// Force a refresh of the layout ensuring the panel is where it should be.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        init();
    }
});

init();
