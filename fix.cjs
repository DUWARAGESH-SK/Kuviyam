const fs = require('fs');

let c = fs.readFileSync('src/background/index.ts','utf8');

c = c.replace(/api\.tabs\.query\(\{ active: true, currentWindow: true \}, \(tabs\) => \{[\s\S]*?if \(tabId && url && !isRestrictedUrl\(url\)\) \{/m, `api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

    if (tabId && !isRestrictedUrl(url)) {`);
    
fs.writeFileSync('src/background/index.ts', c);
console.log("Success");
