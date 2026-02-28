const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const inputSvg = path.join(ROOT, 'public', 'icons', 'misrad-maskable.svg');
const outDir = path.join(ROOT, 'public', 'icons');

const BRAND_BG = '#0F172A';
const sizes = [192, 512];

async function main() {
  if (!fs.existsSync(inputSvg)) {
    throw new Error(`Missing input SVG: ${inputSvg}`);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const size of sizes) {
    const fgSize = Math.round(size * 0.62);

    const foreground = await sharp(inputSvg)
      .resize(fgSize, fgSize, { fit: 'contain' })
      .png()
      .toBuffer();

    const outPath = path.join(outDir, `misrad-maskable-${size}.png`);

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BG,
      },
    })
      .composite([{ input: foreground, gravity: 'center' }])
      .png()
      .toFile(outPath);

    process.stdout.write(`OK ${path.relative(ROOT, outPath)}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
