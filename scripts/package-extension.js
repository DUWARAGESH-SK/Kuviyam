/**
 * scripts/package-extension.js
 * 
 * Packages the dist/ output into a browser-specific zip for store submission.
 * Usage:
 *   node scripts/package-extension.js chrome
 *   node scripts/package-extension.js firefox
 */
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browser = process.argv[2] || 'chrome';
const validBrowsers = ['chrome', 'firefox'];

if (!validBrowsers.includes(browser)) {
  console.error(`❌ Unknown browser "${browser}". Use: chrome | firefox`);
  process.exit(1);
}

const zip = new JSZip();
const distPath = path.join(__dirname, '..', 'dist');
const outputFile = path.join(__dirname, '..', `kuviyam-notes-${browser}.zip`);

function addFolderToZip(folderPath, zipFolder) {
  const items = fs.readdirSync(folderPath);
  for (const item of items) {
    // Skip the .vite folder to prevent multiple manifest.json errors in the web store
    if (item === '.vite') continue;

    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addFolderToZip(fullPath, zipFolder.folder(item));
    } else {
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

console.log(`📦 Packaging extension for ${browser}...`);
addFolderToZip(distPath, zip);

zip.generateAsync({ type: 'nodebuffer' }).then((content) => {
  fs.writeFileSync(outputFile, content);
  console.log(`✅ Extension packaged → ${outputFile}`);
}).catch(err => {
  console.error('❌ Error packaging extension:', err);
  process.exit(1);
});
