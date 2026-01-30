/**
 * Generate PNG icons from SVG for all systems
 * 
 * This script converts SVG icons to PNG format for PWA support
 * Run: node scripts/generate-system-icons.js
 */

const fs = require('fs');
const path = require('path');

// Note: This is a placeholder script
// In production, you would use a library like sharp or svg2png
// For now, we'll create a guide for manual conversion

const systems = ['nexus', 'system', 'scale'];

console.log('📱 יצירת אייקונים למערכות...\n');

systems.forEach(system => {
  const svgPath = path.join(__dirname, `../public/icons/${system}-icon.svg`);
  const png192Path = path.join(__dirname, `../public/icons/${system}-icon-192.png`);
  const png512Path = path.join(__dirname, `../public/icons/${system}-icon-512.png`);
  
  if (fs.existsSync(svgPath)) {
    console.log(`✅ ${system}-icon.svg קיים`);
    
    if (!fs.existsSync(png192Path)) {
      console.log(`⚠️  ${system}-icon-192.png חסר - צריך ליצור ידנית`);
      console.log(`   הוראות:`);
      console.log(`   1. פתח את ${svgPath} ב-Figma/Photoshop/Inkscape`);
      console.log(`   2. ייצא כ-PNG בגדל 192x192`);
      console.log(`   3. שמור ב-${png192Path}`);
    } else {
      console.log(`✅ ${system}-icon-192.png קיים`);
    }
    
    if (!fs.existsSync(png512Path)) {
      console.log(`⚠️  ${system}-icon-512.png חסר - צריך ליצור ידנית`);
      console.log(`   הוראות:`);
      console.log(`   1. פתח את ${svgPath} ב-Figma/Photoshop/Inkscape`);
      console.log(`   2. ייצא כ-PNG בגדל 512x512`);
      console.log(`   3. שמור ב-${png512Path}`);
    } else {
      console.log(`✅ ${system}-icon-512.png קיים`);
    }
  } else {
    console.log(`❌ ${system}-icon.svg לא נמצא`);
  }
  
  console.log('');
});

console.log('💡 טיפ: השתמש ב-https://realfavicongenerator.net/ ליצירת כל הגדלי האייקונים אוטומטית\n');

