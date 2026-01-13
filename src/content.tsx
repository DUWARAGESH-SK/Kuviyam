import { createRoot } from 'react-dom/client';
import type { Note, NoteDraft, PanelLayout } from './types';
import { storage } from './utils/storage';
import { FloatingPanel } from './components/FloatingPanel';

console.log("[Kuviyam] Content script loaded");

// --- Container Setup ---
const container = document.createElement('div');
container.id = 'kuviyam-root';
document.body.appendChild(container);

const shadowRoot = container.attachShadow({ mode: 'open' });
const root = createRoot(shadowRoot);

const style = document.createElement('style');
// Ensure high z-index and pointer interaction rules
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
    console.log("[Kuviyam] Initializing Panel");

    // Safety check: ensure layout exists
    let layout = await storage.getPanelLayout();
    const notes = await storage.getNotes();
    let scratchpad = notes.find(n => n.id === 'global-scratchpad');

    // Default Fallback
    if (!layout || !layout.width) {
        layout = {
            x: window.innerWidth - 350,
            y: 50,
            width: 300,
            height: 400,
            isMinimized: false,
            isOpen: true
        };
        await storage.savePanelLayout(layout);
    }

    // Global Note Fallback
    if (!scratchpad) {
        scratchpad = await storage.createNote({
            title: 'Global Scratchpad',
            content: '',
            tags: ['scratchpad'],
            pinned: true
        });
        scratchpad.id = 'global-scratchpad';
        // Force open for new users
        layout.isOpen = true;
        await storage.savePanelLayout(layout);
        await storage.saveNote(scratchpad);
    }

    renderPanel(layout, scratchpad);
}

function renderPanel(layout: PanelLayout, note: Note) {
    // Determine visibility based on internal state
    if (!layout.isOpen) {
        // Render nothing (or render hidden container) if meant to be closed
        root.render(null);
        return;
    }

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

// --- Listeners ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle-panel") {
        console.log("[Kuviyam] Toggle Command Received");
        storage.getPanelLayout().then(layout => {
            const newLayout = { ...layout, isOpen: !layout.isOpen };
            storage.savePanelLayout(newLayout).then(() => {
                init(); // Re-render with new state
            });
        });
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.panelLayout || changes.notes) {
            init();
        }
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        init();
    }
});

init();
