import { createRoot } from 'react-dom/client';
import type { Note, NoteDraft, PanelLayout } from './types';
import { storage } from './utils/storage';
import { FloatingPanel } from './components/FloatingPanel';

console.log("[Kuviyam] Content script loaded");

let panelMounted = false;
let root: any = null;

// ✅ 1. LISTENER FOR MESSAGES (Popup & Shortcut)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Return true to indicate async response if needed (good practice)

    if (msg.type === "KUV_OPEN_PANEL") {
        mountPanel(true); // Force open
    } else if (msg.type === "KUV_TOGGLE_PANEL") {
        storage.getPanelLayout().then(layout => {
            if (panelMounted && layout.isOpen) {
                // Close it
                unmountPanel();
                updateOpenState(false);
            } else {
                // Open it
                mountPanel(true);
            }
        });
    }
    return true;
});

// ✅ 2. MOUNT LOGIC
async function mountPanel(forceOpen = false) {
    if (panelMounted) return;

    // Create Root
    const container = document.createElement('div');
    container.id = 'kuviyam-root';
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });
    root = createRoot(shadowRoot);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      :host { 
        all: initial; 
        font-family: sans-serif; 
        z-index: 2147483647; 
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        pointer-events: none;
      }
      * { box-sizing: border-box; }
    `;
    shadowRoot.appendChild(style);

    // Data Loading
    let layout = await storage.getPanelLayout();
    const notes = await storage.getNotes();
    let scratchpad = notes.find(n => n.id === 'global-scratchpad');

    if (!scratchpad) {
        scratchpad = await storage.createNote({
            title: 'Global Scratchpad', content: '', tags: ['scratchpad'], pinned: true
        });
        scratchpad.id = 'global-scratchpad';
        await storage.saveNote(scratchpad);

        // Defaults
        layout.isOpen = true;
        layout.width = 350;
        layout.height = 400;
        layout.x = window.innerWidth - 400;
        layout.y = 50;
        await storage.savePanelLayout(layout);
    }

    if (forceOpen) {
        layout.isOpen = true;
        updateOpenState(true);
    }

    renderApp(layout, scratchpad);
    panelMounted = true;
}

function unmountPanel() {
    if (root) {
        root.unmount();
        const el = document.getElementById('kuviyam-root');
        if (el) el.remove();
        panelMounted = false;
        root = null;
    }
}

async function updateOpenState(isOpen: boolean) {
    const layout = await storage.getPanelLayout();
    layout.isOpen = isOpen;
    await storage.savePanelLayout(layout);
}

function renderApp(layout: PanelLayout, note: Note) {
    const handleLayoutChange = async (newLayout: PanelLayout) => {
        await storage.savePanelLayout(newLayout);
    };

    const handleSaveNote = async (draft: NoteDraft, id?: string) => {
        const updatedNote: Note = { ...note, ...draft, id: 'global-scratchpad', updatedAt: Date.now() };
        await storage.saveNote(updatedNote);
    };

    root.render(
        <FloatingPanel
            initialLayout={layout}
            onLayoutChange={handleLayoutChange}
            note={note}
            onSaveNote={handleSaveNote}
            onClose={() => {
                unmountPanel();
                updateOpenState(false);
            }}
        />
    );
}

// ✅ 3. AUTO-REOPEN ON TAB SWITCH (Persistence)
chrome.storage.local.get("panelLayout", (res: any) => {
    if (res.panelLayout && res.panelLayout.isOpen) {
        console.log("Restoring Kuviyam Panel...");
        mountPanel();
    }
});
