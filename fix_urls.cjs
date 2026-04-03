const fs = require('fs');

const restrictedUrlFunc = `
function isRestrictedUrl(u: string): boolean {
    if (!u) return true;
    const restricted = ["edge://", "chrome://", "about:", "chrome-extension://", "moz-extension://", "file://"];
    if (restricted.some(p => u.startsWith(p))) return true;
    try {
        const urlObj = new URL(u);
        if (urlObj.hostname === "chrome.google.com" || urlObj.hostname === "addons.mozilla.org" || urlObj.hostname === "microsoftedge.microsoft.com") return true;
    } catch(e) {}
    return false;
}
`;

let appTsx = fs.readFileSync('src/popup/App.tsx', 'utf8');

// Replace the URL checking block
const RegexToReplaceApp = /\function isRestrictedUrl[\s\S]*?const tabId = tab\.id;/m;
appTsx = appTsx.replace(RegexToReplaceApp, `
      ${restrictedUrlFunc}
      if (isRestrictedUrl(url)) {
        setStatusMsg("Can't natively inject on this site.");
        setTimeout(() => setStatusMsg(""), 3000);
        return;
      }
      const tabId = tab.id;
`);

fs.writeFileSync('src/popup/App.tsx', appTsx);

let bgTs = fs.readFileSync('src/background/index.ts', 'utf8');

const RegexToReplaceBg1 = /function isRestrictedUrl[\s\S]*?\}\n/m;
bgTs = bgTs.replace(RegexToReplaceBg1, `${restrictedUrlFunc}\n`);

// But we injected the function twice in bgTs. Let's just fix it by replacing `function isRestrictedUrl(u) {` and `p => u.startsWith(p)` globally
bgTs = bgTs.replace(/function isRestrictedUrl\(u\) \{/g, 'function isRestrictedUrl(u: string): boolean {');
appTsx = appTsx.replace(/function isRestrictedUrl\(u\) \{/g, 'function isRestrictedUrl(u: string): boolean {');
bgTs = bgTs.replace(/p => u\.startsWith\(p\)/g, '(p: string) => u.startsWith(p)');
appTsx = appTsx.replace(/p => u\.startsWith\(p\)/g, '(p: string) => u.startsWith(p)');


fs.writeFileSync('src/popup/App.tsx', appTsx);
fs.writeFileSync('src/background/index.ts', bgTs);

console.log("Fixed types!");
