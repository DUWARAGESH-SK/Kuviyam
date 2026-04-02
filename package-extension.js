import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const zip = new JSZip();

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

console.log('Packaging extension...');
addFolderToZip('./dist', zip);

zip.generateAsync({ type: 'nodebuffer' }).then((content) => {
  fs.writeFileSync('./kuviyam-notes-release.zip', content);
  console.log('✅ Extension packaged successfully into kuviyam-notes-release.zip');
}).catch(err => {
  console.error('Error packaging extension:', err);
});
