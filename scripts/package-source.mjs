import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const zip = new JSZip();

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', '.vite']);
const EXCLUDED_EXTS = new Set(['.zip', '.crx', '.pem']);

function addFolderToZip(dirPath, zipFolder) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (EXCLUDED_DIRS.has(item)) continue;
    
    const ext = path.extname(item).toLowerCase();
    if (EXCLUDED_EXTS.has(ext)) continue;

    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addFolderToZip(fullPath, zipFolder.folder(item));
    } else {
      const content = fs.readFileSync(fullPath);
      zipFolder.file(item, content);
    }
  }
}

console.log('Packaging source code...');
addFolderToZip(ROOT, zip);

const outputFile = path.join(ROOT, 'Kuviyam-Notes-FF-Source-v1.0.0.zip');

zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 4 },
}).then((content) => {
  fs.writeFileSync(outputFile, content);
  console.log(`✅ Source code packaged -> ${outputFile}`);
}).catch(err => {
  console.error('❌ Error packaging source:', err);
  process.exit(1);
});
