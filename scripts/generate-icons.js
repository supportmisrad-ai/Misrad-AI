// Script to generate PWA icons from SVG
// Run: node scripts/generate-icons.js
// Requires: sharp package (npm install sharp --save-dev)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created icon-${size}.png`);
    } catch (error) {
      console.error(`❌ Error creating icon-${size}.png:`, error.message);
    }
  }
  
  console.log('✨ Done! Icons are ready in /public folder');
}

generateIcons();

