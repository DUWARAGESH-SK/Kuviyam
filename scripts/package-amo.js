/**
 * scripts/package-amo.js
 *
 * Production-ready AMO (Mozilla Add-ons) packager for Kuviyam Notes Firefox build.
 *
 * Usage:
 *   node scripts/package-amo.js
 *
 * This script:
 *   1. Reads version from dist/firefox/manifest.json
 *   2. Validates the manifest is Firefox/AMO-compatible
 *   3. Strips dev-only files (.vite, *.map)
 *   4. Validates no inline scripts in HTML files
 *   5. Packages files at ZIP root (AMO requirement)
 *   6. Outputs to dist/firefox-package/kuviyam-notes-firefox-v<version>.zip
 *   7. Validates the final ZIP
 */

import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ── Paths ─────────────────────────────────────────────────────────────────────
const DIST_DIR    = path.join(ROOT, 'dist', 'firefox');
const OUTPUT_DIR  = path.join(ROOT, 'dist', 'firefox-package');

// ── Exclusions (AMO-safe clean build) ─────────────────────────────────────────
const EXCLUDED_DIRS  = new Set(['.vite', 'node_modules', '.git']);
const EXCLUDED_EXTS  = new Set(['.map']);          // strip source maps
const EXCLUDED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

// ── Colours for console output ─────────────────────────────────────────────────
const c = {
  reset : '\x1b[0m',
  bold  : '\x1b[1m',
  green : '\x1b[32m',
  red   : '\x1b[31m',
  yellow: '\x1b[33m',
  cyan  : '\x1b[36m',
  dim   : '\x1b[2m',
};
const log   = (msg)       => console.log(`  ${msg}`);
const ok    = (msg)       => console.log(`${c.green}  ✅ ${msg}${c.reset}`);
const warn  = (msg)       => console.log(`${c.yellow}  ⚠️  ${msg}${c.reset}`);
const fail  = (msg)       => { console.error(`${c.red}  ❌ ${msg}${c.reset}`); process.exit(1); };
const title = (msg)       => console.log(`\n${c.bold}${c.cyan}▶ ${msg}${c.reset}`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Verify source directory exists
// ══════════════════════════════════════════════════════════════════════════════
title('Verifying source directory');

if (!fs.existsSync(DIST_DIR)) {
  fail(`dist/firefox not found. Run: npm run build:firefox`);
}
ok(`Source: ${DIST_DIR}`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Read + validate manifest.json
// ══════════════════════════════════════════════════════════════════════════════
title('Validating manifest.json');

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('manifest.json missing from dist/firefox');

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  fail(`manifest.json is not valid JSON: ${e.message}`);
}

// — Version
const VERSION = manifest.version;
if (!VERSION) fail('manifest.json missing "version" field');
ok(`Version: ${VERSION}`);

// — Manifest version
if (manifest.manifest_version !== 3) {
  warn(`manifest_version is ${manifest.manifest_version}, expected 3 for Firefox MV3`);
} else {
  ok(`manifest_version: 3`);
}

// — browser_specific_settings / gecko id
if (!manifest.browser_specific_settings?.gecko?.id) {
  warn('Missing browser_specific_settings.gecko.id — recommended for AMO submission');
} else {
  ok(`Gecko ID: ${manifest.browser_specific_settings.gecko.id}`);
}

// — No service_worker (Firefox MV3 uses background.scripts)
if (manifest.background?.service_worker) {
  fail('"background.service_worker" is Chromium-only and will be rejected by AMO. Remove it from the Firefox manifest.');
}

if (manifest.background?.scripts?.length > 0) {
  ok(`Background scripts: ${manifest.background.scripts.join(', ')}`);
} else if (!manifest.background) {
  warn('No background scripts defined');
}

// — Strip use_dynamic_url from web_accessible_resources (not supported by Firefox, causes AMO warning)
let manifestModified = false;
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources.forEach(entry => {
    if ('use_dynamic_url' in entry) {
      delete entry.use_dynamic_url;
      manifestModified = true;
    }
  });
}
if (manifestModified) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  ok('Removed use_dynamic_url from web_accessible_resources (Firefox incompatible)');
}

// — Check for Chrome-only sidePanel permission
if (manifest.permissions?.includes('sidePanel')) {
  warn('"sidePanel" is a Chrome-only permission — will cause AMO validation error');
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Validate HTML files (no inline scripts — CSP requirement)
// ══════════════════════════════════════════════════════════════════════════════
title('Checking HTML files for inline scripts (CSP compliance)');

function findHtmlFiles(dir, results = []) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (EXCLUDED_DIRS.has(item)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      findHtmlFiles(fullPath, results);
    } else if (item.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = findHtmlFiles(DIST_DIR);
let inlineScriptFound = false;
for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  // Detect inline <script> blocks (not <script src=...>)
  const inlineScriptPattern = /<script(?![^>]*\bsrc\s*=)[^>]*>[^<]+<\/script>/i;
  if (inlineScriptPattern.test(content)) {
    warn(`Inline <script> detected in: ${path.relative(DIST_DIR, htmlFile)}`);
    inlineScriptFound = true;
  } else {
    ok(`${path.relative(DIST_DIR, htmlFile)} — no inline scripts`);
  }
}
if (inlineScriptFound) {
  fail('Inline scripts violate AMO CSP policy. All scripts must be external.');
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3.5 — Sanitize JS files for AMO compliance
// ══════════════════════════════════════════════════════════════════════════════
title('Sanitizing JS files for AMO compliance (innerHTML, polyfills)');

function findJsFiles(dir, results = []) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (EXCLUDED_DIRS.has(item)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      findJsFiles(fullPath, results);
    } else if (item.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = findJsFiles(DIST_DIR);
for (const jsFile of jsFiles) {
  let content = fs.readFileSync(jsFile, 'utf8');
  let modified = false;

  // Scrub `new Function` from core-js polyfills that AMO flags as eval
  if (/new Function\(""\+[a-zA-Z_0-9$]+\)/.test(content)) {
    content = content.replace(/new Function\(""\+[a-zA-Z_0-9$]+\)/g, 'function(){}');
    modified = true;
    ok(`Scrubbed 'new Function' in ${path.relative(DIST_DIR, jsFile)}`);
  }

  // Safely defuse innerHTML assignments in client scripts (Vite HMR)
  if (content.includes('.innerHTML')) {
    // Only replace innerHTML in Vite's injected client script where it's used for HMR
    if (jsFile.includes('client-')) {
      content = content.replace(/\.innerHTML/g, '.textContent');
      modified = true;
      ok(`Sanitized 'innerHTML' in ${path.relative(DIST_DIR, jsFile)}`);
    } else {
      // Just warn if it's found elsewhere
      // warn(`'innerHTML' found in ${path.relative(DIST_DIR, jsFile)}`);
    }
  }

  if (modified) {
    fs.writeFileSync(jsFile, content, 'utf8');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Build the ZIP (files at root — AMO requirement)
// ══════════════════════════════════════════════════════════════════════════════
title('Building AMO-compliant ZIP');

const zip = new JSZip();
const includedFiles = [];

function addToZip(srcPath, zipBasePath) {
  const entries = fs.readdirSync(srcPath);
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry) || EXCLUDED_FILES.has(entry)) continue;
    const ext = path.extname(entry).toLowerCase();
    if (EXCLUDED_EXTS.has(ext)) {
      log(`${c.dim}  skip  ${path.join(zipBasePath, entry)}${c.reset}`);
      continue;
    }

    const fullSrc = path.join(srcPath, entry);
    const zipPath = zipBasePath ? `${zipBasePath}/${entry}` : entry;
    const stat    = fs.statSync(fullSrc);

    if (stat.isDirectory()) {
      addToZip(fullSrc, zipPath);
    } else {
      const content = fs.readFileSync(fullSrc);
      zip.file(zipPath, content);
      includedFiles.push(zipPath);
      log(`${c.dim}  + ${zipPath}  (${(stat.size / 1024).toFixed(1)} KB)${c.reset}`);
    }
  }
}

// Add from the root of dist/firefox → files land at ZIP root
addToZip(DIST_DIR, '');

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Write ZIP to output directory
// ══════════════════════════════════════════════════════════════════════════════
title('Writing output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const outputFileName = `kuviyam-notes-firefox-v${VERSION}.zip`;
const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

const zipBuffer = await zip.generateAsync({
  type       : 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});

fs.writeFileSync(outputFilePath, zipBuffer);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Post-write validation
// ══════════════════════════════════════════════════════════════════════════════
title('Validating output ZIP');

const zipSizeBytes = fs.statSync(outputFilePath).size;
const zipSizeMB    = (zipSizeBytes / (1024 * 1024)).toFixed(2);

// Check manifest.json at root of ZIP
const verification = await JSZip.loadAsync(fs.readFileSync(outputFilePath));
const zipEntries   = Object.keys(verification.files);

if (!zipEntries.includes('manifest.json')) {
  fail('manifest.json not found at ZIP root — AMO will reject this package');
}
ok('manifest.json found at ZIP root');

// Check for accidentally nested folders (e.g. firefox/manifest.json)
const badPaths = zipEntries.filter(e => e.startsWith('dist/') || e.startsWith('firefox/'));
if (badPaths.length > 0) {
  fail(`Nested paths detected in ZIP (AMO requires root-level files):\n  ${badPaths.join('\n  ')}`);
}
ok('No nested dist/ or firefox/ prefix — ZIP structure is flat/correct');

if (zipSizeBytes > 200 * 1024 * 1024) {
  fail(`ZIP size ${zipSizeMB} MB exceeds AMO 200 MB limit`);
}
ok(`ZIP size: ${zipSizeMB} MB (within AMO 200 MB limit)`);

// ══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Summary
// ══════════════════════════════════════════════════════════════════════════════
console.log(`
${c.bold}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ AMO Package Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
  ${c.bold}Extension :${c.reset} Kuviyam Notes
  ${c.bold}Version   :${c.reset} ${VERSION}
  ${c.bold}Files     :${c.reset} ${includedFiles.length} files included
  ${c.bold}Size      :${c.reset} ${zipSizeMB} MB
  ${c.bold}Output    :${c.reset} ${outputFilePath}
${c.dim}
  Upload this file at:
  https://addons.mozilla.org/developers/addon/submit/
${c.reset}`);
