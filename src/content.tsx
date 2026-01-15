import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingPanel from './components/FloatingPanel';
import { storage } from './utils/storage';

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
    const shadowRoot = document.createElement('div');
    shadowRoot.style.position = 'fixed';
    shadowRoot.style.zIndex = '2147483647';
    shadowRoot.style.pointerEvents = 'none'; // Host should not block
    shadowRoot.style.inset = '0';
    shadow.appendChild(shadowRoot);

    // Inject styles
    try {
        const response = await fetch(chrome.runtime.getURL('src/index.css'));
        const css = await response.text();
        const style = document.createElement('style');
        style.textContent = css;
        shadow.appendChild(style);

        // Also inject fonts
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
            <FloatingPanel onClose={() => {
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
        // If already mounted but hidden, show it
        const root = document.getElementById(id);
        if (root && root.shadowRoot) {
            const container = root.shadowRoot.querySelector('div');
            if (container) container.style.display = 'block';
        }
    }
});
