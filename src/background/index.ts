import { storage } from '../shared/storage';
import type { NoteDraft } from '../types';

console.log("Kuviyam Notes Background Script Loaded");

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "save-to-kuviyam",
        title: "Save to Kuviyam Notes",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
            chrome.action.setBadgeText({ text: "OK" });
            setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000);
        } catch (err) {
            console.error("Failed to save note", err);
        }
    }
});

// ✅ KEYBOARD SHORTCUT HANDLER
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-panel") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
                // Check if we can sendMessage (skip restricted pages check here, let content script handle or fail silently)
                chrome.tabs.sendMessage(tabId, {
                    type: "KUV_TOGGLE_PANEL"
                }).catch(async () => {
                    // Content script might not be loaded on this tab (e.g. pre-opened tab)
                    try {
                        const manifest = chrome.runtime.getManifest();
                        const contentScripts = manifest.content_scripts?.[0];
                        if (contentScripts && contentScripts.js) {
                            await chrome.scripting.executeScript({
                                target: { tabId },
                                files: contentScripts.js
                            });
                            if (contentScripts.css) {
                                await chrome.scripting.insertCSS({
                                    target: { tabId },
                                    files: contentScripts.css
                                });
                            }
                            setTimeout(() => {
                                chrome.tabs.sendMessage(tabId, { type: "KUV_TOGGLE_PANEL" }).catch(() => {});
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
        const settings = await storage.getSettings();
        if (settings.stickMode !== 'global') return;
        
        const layout = await storage.getPanelLayout();
        if (!layout.isOpen) return;

        chrome.tabs.sendMessage(tabId, { type: "KUV_TAB_ACTIVATED" }).catch(async () => {
            // Content script might not be loaded on this tab (e.g. pre-opened tab)
            try {
                const manifest = chrome.runtime.getManifest();
                const contentScripts = manifest.content_scripts?.[0];
                if (contentScripts && contentScripts.js) {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: contentScripts.js
                    });
                    if (contentScripts.css) {
                        await chrome.scripting.insertCSS({
                            target: { tabId },
                            files: contentScripts.css
                        });
                    }
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { type: "KUV_TAB_ACTIVATED" }).catch(() => {});
                    }, 200);
                }
            } catch (e) {
                console.log("Could not dynamically inject on tab switch", tabId);
            }
        });
    } catch(e) {}
};

chrome.tabs.onActivated.addListener((activeInfo) => {
    ensureScriptInjectedAndActivate(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        ensureScriptInjectedAndActivate(tabId);
    }
});
