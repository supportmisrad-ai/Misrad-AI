const sharp = require('sharp');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Generate "any" purpose icons (full bleed)
  const anySvg = path.join(iconsDir, 'misrad-icon-512.svg');
  
  await sharp(anySvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'misrad-icon-192.png'));
  console.log('✅ Generated: misrad-icon-192.png (any purpose)');
    
  await sharp(anySvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'misrad-icon-512.png'));
  console.log('✅ Generated: misrad-icon-512.png (any purpose)');
  
  // Generate "maskable" purpose icons (with safe zone)
  const maskableSvg = path.join(iconsDir, 'misrad-maskable-512.svg');
  
  await sharp(maskableSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'misrad-maskable-192.png'));
  console.log('✅ Generated: misrad-maskable-192.png (maskable purpose)');
    
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'misrad-maskable-512.png'));
  console.log('✅ Generated: misrad-maskable-512.png (maskable purpose)');
  
  console.log('\n🎉 All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
