// Script to generate Scale icon PNGs from SVG
// Run: node scripts/generate-scale-icons.js
// Requires: sharp package (npm install sharp --save-dev)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192];
const inputSvg = path.join(__dirname, '../public/icons/scale-icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateScaleIcons() {
  console.log('🎨 Generating Scale icon PNGs...');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `scale-icon-${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created scale-icon-${size}.png`);
    } catch (error) {
      console.error(`❌ Error creating scale-icon-${size}.png:`, error.message);
    }
  }
  
  console.log('✨ Done! Scale icons are ready in /public/icons folder');
}

generateScaleIcons();

