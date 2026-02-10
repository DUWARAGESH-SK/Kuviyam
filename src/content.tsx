import React from 'react';
import { createRoot } from 'react-dom/client';
import StickyNotes from './components/StickyNotes';
import { storage } from './utils/storage';

const id = 'kuviyam-root';
let panelMounted = false;

// MINIMAL CSS - Tailwind essentials with SYSTEM FONTS
const minimalCSS = `
  /* Tailwind base styles */
  *, ::before, ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: currentColor;
  }
  
  /* FORCE SYSTEM FONTS GLOBALLY IN SHADOW DOM */
  body, div, span, button, input, textarea {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  }
  
  /* Flex utilities */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1 1 0%; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  
  /* Layout */
  .fixed { position: fixed; }
  .absolute { position: absolute; }
  .relative { position: relative; }
  .inset-0 { inset: 0; }
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  
  /* Spacing */
  .p-6 { padding: 1.5rem; }
  .p-2 { padding: 0.5rem; }
  .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .ml-2 { margin-left: 0.5rem; }
  .mr-2 { margin-right: 0.5rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .gap-2 { gap: 0.5rem; }
  
  /* Borders */
  .border { border-width: 1px; }
  .border-b { border-bottom-width: 1px; }
  .border-gray-200 { border-color: #e5e7eb; }
  .border-gray-100 { border-color: #f3f4f6; }
  .border-gray-300 { border-color: #d1d5db; }
  .border-transparent { border-color: transparent; }
  
  /* Colors */
  .bg-white { background-color: #ffffff; }
  .bg-gray-50 { background-color: #f9fafb; }
  .bg-indigo-600 { background-color: #4f46e5; }
  .bg-transparent { background-color: transparent; }
  
  .text-gray-900 { color: #111827; }
  .text-gray-700 { color: #374151; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-400 { color: #9ca3af; }
  .text-gray-300 { color: #d1d5db; }
  .text-indigo-600 { color: #4f46e5; }
  .text-white { color: #ffffff; }
  
  /* Typography */
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  
  .font-bold { font-weight: 700; }
  .font-medium { font-weight: 500; }
  
  .tracking-wide { letter-spacing: 0.025em; }
  .tracking-widest { letter-spacing: 0.1em; }
  .uppercase { text-transform: uppercase; }
  
  /* Borders Radius */
  .rounded-xl { border-radius: 0.75rem; }
  .rounded-t-xl { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
  .rounded-b-xl { border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; }
  .rounded-full { border-radius: 9999px; }
  
  /* Shadows */
  .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
  
  /* Cursor */
  .cursor-move { cursor: move; }
  .cursor-se-resize { cursor: se-resize; }
  
  /* Interactive */
  .hover\\:bg-indigo-700:hover { background-color: #4338ca; }
  .hover\\:text-gray-600:hover { color: #4b5563; }
  .hover\\:border-indigo-500:hover { border-color: #6366f1; }
  
  .transition-colors { transition-property: color, background-color, border-color; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
  
  /* Focus */
  .focus-within\\:border-indigo-50:focus-within { border-color: #eef2ff; }
  .focus\\:ring-0:focus { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
  
  /* Placeholder */
  .placeholder-gray-300::placeholder { color: #d1d5db; }
  .placeholder-gray-400::placeholder { color: #9ca3af; }
  
  /* Scrollbar */
  .overflow-hidden { overflow: hidden; }
  .overflow-y-auto { overflow-y: auto; }
  
  /* Selection */
  .select-none { user-select: none; }
  
  /* Animation */
  .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
  }
  
  /* Resets */
  button, input, textarea {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    margin: 0;
    padding: 0;
  }
  
  button {
    cursor: pointer;
    background: transparent;
  }
  
  input:focus, textarea:focus {
    outline: none;
  }
  
  /* Custom scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

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
  shadowRoot.style.pointerEvents = 'none';
  shadowRoot.style.inset = '0';
  shadow.appendChild(shadowRoot);

  // Tailwind CSS CDN
  const tailwindLink = document.createElement('link');
  tailwindLink.rel = 'stylesheet';
  tailwindLink.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  shadow.appendChild(tailwindLink);

  // User provided solution for Shadow DOM and positioning
  const style = document.createElement('style');
  style.textContent = `
    /* RESET for Shadow DOM */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    /* Force Material Icons to load */
    @font-face {
      font-family: 'Material Symbols Rounded';
      font-style: normal;
      font-weight: 100 700;
      src: url(https://fonts.gstatic.com/s/materialsymbolsrounded/v168/sykg-zNym6YjUruM-QrEh7-nyTnjDwKNJ_190Fjzag.woff2) format('woff2');
    }
    
    .material-symbols-rounded {
      font-family: 'Material Symbols Rounded';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Ensure buttons are visible and stacked correctly */
    button {
      position: relative !important;
      z-index: 10 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 40px !important;
      min-height: 40px !important;
    }
    
    /* Fix overlapping */
    div, header, main, span, button {
      position: relative !important;
    }
    
    /* Specific fix for StickyNotes layout */
    #kuviyam-panel-container > div {
      position: fixed !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
    }
    
    /* Force visibility */
    header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
    }
    
    /* Make sure icons display */
    .material-symbols-rounded {
      display: inline-block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  `;
  shadow.appendChild(style);

  // NO EXTERNAL FONTS - Using System Fonts defined in minimalCSS

  // IMPORTANT: Enable pointer events on the panel container itself
  const reactContainer = document.createElement('div');
  reactContainer.style.pointerEvents = 'auto'; // This allows interaction
  shadowRoot.appendChild(reactContainer);

  const reactRoot = createRoot(reactContainer);
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
