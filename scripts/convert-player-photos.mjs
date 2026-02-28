/**
 * convert-player-photos.mjs
 *
 * Converts existing .jpg player photos to 100x100 WebP and deletes the originals.
 *
 * Usage:
 *   node scripts/convert-player-photos.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_DIR = path.join(__dirname, '../public/players');

const jpgFiles = fs.readdirSync(PLAYERS_DIR, { recursive: true })
  .filter(f => f.endsWith('.jpg'))
  .map(f => path.join(PLAYERS_DIR, f));

console.log(`\n🔄  Converting ${jpgFiles.length} images to 100x100 WebP...\n`);

let done = 0;
let errors = 0;

for (const jpgPath of jpgFiles) {
  const webpPath = jpgPath.replace('.jpg', '.webp');
  try {
    await sharp(jpgPath).resize(100, 100, { fit: 'cover' }).webp({ quality: 85 }).toFile(webpPath);
    fs.unlinkSync(jpgPath);
    done++;
    process.stdout.write(`\r  ✅ ${done}/${jpgFiles.length}`);
  } catch (err) {
    console.error(`\n  ❌ ${jpgPath}: ${err.message}`);
    errors++;
  }
}

// Regenerate manifest.json
const manifest = {};
for (const category of fs.readdirSync(PLAYERS_DIR)) {
  const catDir = path.join(PLAYERS_DIR, category);
  if (!fs.statSync(catDir).isDirectory()) continue;
  const files = fs.readdirSync(catDir)
    .filter(f => f.endsWith('.webp'))
    .sort()
    .map(f => `players/${category}/${f}`);
  if (files.length > 0) manifest[category] = files;
}
fs.writeFileSync(path.join(PLAYERS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n\n✅  Done: ${done}   ❌  Errors: ${errors}`);
console.log(`📋  Manifest updated → public/players/manifest.json`);
console.log(`    Total photos: ${Object.values(manifest).reduce((s, a) => s + a.length, 0)}`);
