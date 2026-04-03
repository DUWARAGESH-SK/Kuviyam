/**
 * scripts/generate-icons.js
 *
 * Generates square extension icons from public/logo.png
 * Outputs to public/icons/icon-{size}.png
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(ROOT, 'public', 'logo.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

// Required sizes for AMO + Chrome Web Store
const SIZES = [16, 32, 48, 96, 128];

if (!fs.existsSync(SOURCE)) {
  console.error(`❌ Source not found: ${SOURCE}`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`\n🎨 Generating square icons from: ${SOURCE}\n`);

const meta = await sharp(SOURCE).metadata();
console.log(`   Source dimensions: ${meta.width}×${meta.height}`);

for (const size of SIZES) {
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);

  await sharp(SOURCE)
    .resize(size, size, {
      fit: 'contain',          // preserve aspect, pad to square
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
    })
    .png()
    .toFile(outPath);

  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`   ✅ ${size}×${size} → icons/icon-${size}.png  (${kb} KB)`);
}

console.log(`\n✅ All icons generated in: public/icons/\n`);
