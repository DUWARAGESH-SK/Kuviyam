const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace all `chrome.` that match API namespaces
    const pattern = /\bchrome\.(runtime|tabs|storage|action|scripting|contextMenus|commands)/g;
    
    if (pattern.test(content)) {
        if (!content.includes("from '@/shared/api'")) {
            const importStatement = "import { api } from '@/shared/api';\n";
            content = importStatement + content;
        }
        content = content.replace(pattern, 'api.$1');
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No updates for ${filePath}`);
    }
}

const files = [
    'src/popup/App.tsx',
    'src/features/notes/components/StickyNotes.tsx',
    'src/content/index.tsx',
    'src/background/index.ts'
];

files.forEach(f => replaceInFile(path.join(__dirname, f)));
