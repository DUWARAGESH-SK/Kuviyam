import React from 'react';
import { createRoot } from 'react-dom/client';
import StickyNotes from './components/StickyNotes';
import { storage } from './utils/storage';
import indexStyles from './index.css?inline';

const id = 'kuviyam-root';
let panelMounted = false;

async function mountPanel() {
    if (panelMounted) return;

    let root = document.getElementById(id);
    if (!root) {
        root = document.createElement('div');
        root.id = id;
        document.body.appendChild(root);
    }

    const shadow = root.attachShadow({ mode: 'open' });

    // Style container
    const shadowRoot = document.createElement('div');
    shadowRoot.id = 'kuviyam-panel-container';
    shadowRoot.style.position = 'fixed';
    shadowRoot.style.zIndex = '2147483647';
    shadowRoot.style.pointerEvents = 'none'; // Shadow root doesn't block
    shadowRoot.style.inset = '0';
    shadow.appendChild(shadowRoot);

    // Inject styles
    try {
        const style = document.createElement('style');
        style.textContent = indexStyles;
        shadow.appendChild(style);

        // Inject Fonts & Icons
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        shadow.appendChild(fontLink);

        const iconLink = document.createElement('link');
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        shadow.appendChild(iconLink);
    } catch (e) {
        console.error("[Kuviyam] Style injection failed", e);
    }

    const reactRoot = createRoot(shadowRoot);
    reactRoot.render(
        <React.StrictMode>
            <StickyNotes onClose={() => {
                shadowRoot.style.display = 'none';
                storage.getPanelLayout().then(layout => {
                    storage.savePanelLayout({ ...layout, isOpen: false });
                });
            }} />
        </React.StrictMode>
    );
    panelMounted = true;
}

// Auto-restore on load if was open
storage.getPanelLayout().then(layout => {
    if (layout.isOpen) {
        mountPanel();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'KUV_OPEN_PANEL') {
        mountPanel();
        const root = document.getElementById(id);
        if (root && root.shadowRoot) {
            const container = root.shadowRoot.querySelector('#kuviyam-panel-container');
            if (container instanceof HTMLElement) container.style.display = 'block';
        }
    }
});
