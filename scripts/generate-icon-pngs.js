#!/usr/bin/env node
/**
 * Generate 192x192 PNG icons from SVG source files.
 * Usage: node scripts/generate-icon-pngs.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZE = 192;

const MODULES = ['client', 'social', 'finance', 'operations', 'nexus', 'system', 'admin', 'misrad', 'scale'];

async function main() {
  let generated = 0;
  let skipped = 0;

  for (const mod of MODULES) {
    const svgPath = path.join(ICONS_DIR, `${mod}-icon.svg`);
    const pngPath = path.join(ICONS_DIR, `${mod}-icon-192.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`  SKIP  ${mod}-icon.svg (not found)`);
      skipped++;
      continue;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer, { density: 300 })
      .resize(SIZE, SIZE)
      .png()
      .toFile(pngPath);

    const stat = fs.statSync(pngPath);
    console.log(`  OK    ${mod}-icon-192.png  (${stat.size} bytes)`);
    generated++;
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
