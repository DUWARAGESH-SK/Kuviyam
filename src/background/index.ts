import { api } from '@/shared/api';
import { storage } from '../shared/storage';
import type { NoteDraft } from '../types';

console.log("Kuviyam Notes Background Script Loaded");

api.runtime.onInstalled.addListener(() => {
    api.contextMenus.create({
        id: "save-to-kuviyam",
        title: "Save to Kuviyam Notes",
        contexts: ["selection"]
    });
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-to-kuviyam" && info.selectionText) {
        const draft: NoteDraft = {
            title: tab?.title || "Clipped Note",
            content: info.selectionText,
            tags: ["clipped"],
            url: tab?.url,
            domain: tab?.url ? new URL(tab.url).hostname : undefined,
            pinned: false
        };

        try {
            await storage.createNote(draft);
            api.action.setBadgeText({ text: "OK" });
            setTimeout(() => api.action.setBadgeText({ text: "" }), 2000);
        } catch (err) {
            console.error("Failed to save note", err);
        }
    }
});

// ✅ KEYBOARD SHORTCUT HANDLER
api.commands.onCommand.addListener((command) => {
    if (command === "toggle-panel") {
        
api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    const url = tabs[0]?.url;

    function isRestrictedUrl(u: string | undefined): boolean {
        if (!u) return true;
        const restricted = ["edge://", "chrome://", "about:", "chrome-extension://", "moz-extension://", "file://"];
        if (restricted.some(p => u.startsWith(p))) return true;
        try {
            const urlObj = new URL(u);
            if (urlObj.hostname === "chrome.google.com" || urlObj.hostname === "addons.mozilla.org" || urlObj.hostname === "microsoftedge.microsoft.com") return true;
        } catch(e) {}
        return false;
    }

    if (tabId && !isRestrictedUrl(url)) {

                // Check if we can sendMessage (skip restricted pages check here, let content script handle or fail silently)
                api.tabs.sendMessage(tabId, {
                    type: "KUV_TOGGLE_PANEL"
                }).catch(async () => {
                    // Content script might not be loaded on this tab (e.g. pre-opened tab)
                    try {
                        const manifest = api.runtime.getManifest();
                        const contentScripts = manifest.content_scripts?.[0];
                        if (contentScripts && contentScripts.js) {
                            await api.scripting.executeScript({
                                target: { tabId },
                                files: contentScripts.js
                            });
                            if (contentScripts.css) {
                                await api.scripting.insertCSS({
                                    target: { tabId },
                                    files: contentScripts.css
                                });
                            }
                            setTimeout(() => {
                                api.tabs.sendMessage(tabId, { type: "KUV_TOGGLE_PANEL" }).catch(() => {});
                            }, 200);
                        }
                    } catch (e) {
                         console.log("Could not dynamically inject or send toggle command to tab", tabId);
                    }
                });
            }
        });
    }
});


const ensureScriptInjectedAndActivate = async (tabId: number) => {
    try {
        const tab = await api.tabs.get(tabId);
        function isRestrictedUrl(u: string | undefined): boolean {
            if (!u) return true;
            const restricted = ["edge://", "chrome://", "about:", "chrome-extension://", "moz-extension://", "file://"];
            if (restricted.some(p => u.startsWith(p))) return true;
            try {
                const urlObj = new URL(u);
                if (urlObj.hostname === "chrome.google.com" || urlObj.hostname === "addons.mozilla.org" || urlObj.hostname === "microsoftedge.microsoft.com") return true;
            } catch(e) {}
            return false;
        }

        if (isRestrictedUrl(tab.url)) return;
    } catch(e) { return; }

    try {
        const settings = await storage.getSettings();
        if (settings.stickMode !== 'global') return;
        
        const layout = await storage.getPanelLayout();
        if (!layout.isOpen) return;

        api.tabs.sendMessage(tabId, { type: "KUV_TAB_ACTIVATED" }).catch(async () => {
            // Content script might not be loaded on this tab (e.g. pre-opened tab)
            try {
                const manifest = api.runtime.getManifest();
                const contentScripts = manifest.content_scripts?.[0];
                if (contentScripts && contentScripts.js) {
                    await api.scripting.executeScript({
                        target: { tabId },
                        files: contentScripts.js
                    });
                    if (contentScripts.css) {
                        await api.scripting.insertCSS({
                            target: { tabId },
                            files: contentScripts.css
                        });
                    }
                    setTimeout(() => {
                        api.tabs.sendMessage(tabId, { type: "KUV_TAB_ACTIVATED" }).catch(() => {});
                    }, 200);
                }
            } catch (e) {
                console.log("Could not dynamically inject on tab switch", tabId);
            }
        });
    } catch(e) {}
};

api.tabs.onActivated.addListener((activeInfo) => {
    ensureScriptInjectedAndActivate(activeInfo.tabId);
});

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        ensureScriptInjectedAndActivate(tabId);
    }
});
