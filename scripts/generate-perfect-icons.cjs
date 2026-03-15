const sharp = require('sharp');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
const inputSvg = path.join(iconsDir, 'misrad-pwa.svg');

async function generateIcons() {
  // Generate all standard PWA icon sizes
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of sizes) {
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `misrad-${size}.png`));
    console.log(`✅ Generated: misrad-${size}.png`);
  }
  
  // Generate apple-touch-icon (180x180 is standard for iOS)
  await sharp(inputSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✅ Generated: apple-touch-icon.png (180x180 for iOS)');
  
  // Generate maskable versions (same file, different purpose in manifest)
  await sharp(inputSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'misrad-maskable-192.png'));
  console.log('✅ Generated: misrad-maskable-192.png');
    
  await sharp(inputSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'misrad-maskable-512.png'));
  console.log('✅ Generated: misrad-maskable-512.png');
  
  console.log('\n🎉 All PWA icons generated successfully!');
  console.log('📱 iOS: apple-touch-icon.png (180x180)');
  console.log('🤖 Android: maskable icons with safe zone');
}

generateIcons().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
