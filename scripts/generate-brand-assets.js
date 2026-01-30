const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SOURCE_SVG = path.join(ROOT, 'public', 'icons', 'misrad-icon.svg');

const PUBLIC_DIR = path.join(ROOT, 'public');
const ANDROID_RES_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const APP_DIR = path.join(ROOT, 'app');
const PUBLIC_ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function renderPaddedPngBuffer({
  svgPath,
  size,
  scale = 0.86,
  background = { r: 0, g: 0, b: 0, alpha: 0 },
}) {
  const inner = Math.max(1, Math.round(size * scale));
  const pad = Math.floor((size - inner) / 2);

  const rendered = await sharp(svgPath)
    .resize(inner, inner, { fit: 'contain' })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: rendered, left: pad, top: pad }])
    .png()
    .toBuffer();
}

function buildIcoFromPngBuffers(pngBuffers, sizes) {
  if (pngBuffers.length !== sizes.length) {
    throw new Error('pngBuffers and sizes length mismatch');
  }

  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * count;

  let offset = dirSize;
  const entries = [];

  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const png = pngBuffers[i];

    const width = size >= 256 ? 0 : size;
    const height = size >= 256 ? 0 : size;

    entries.push({
      width,
      height,
      bytesInRes: png.length,
      imageOffset: offset,
    });

    offset += png.length;
  }

  const out = Buffer.alloc(dirSize);
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type (1=icon)
  out.writeUInt16LE(count, 4); // count

  for (let i = 0; i < count; i++) {
    const base = headerSize + i * entrySize;
    const e = entries[i];

    out.writeUInt8(e.width, base + 0);
    out.writeUInt8(e.height, base + 1);
    out.writeUInt8(0, base + 2); // color count
    out.writeUInt8(0, base + 3); // reserved
    out.writeUInt16LE(1, base + 4); // planes
    out.writeUInt16LE(32, base + 6); // bit count
    out.writeUInt32LE(e.bytesInRes, base + 8);
    out.writeUInt32LE(e.imageOffset, base + 12);
  }

  return Buffer.concat([out, ...pngBuffers]);
}

async function writeFileIfChanged(filePath, data) {
  try {
    const existing = fs.readFileSync(filePath);
    if (Buffer.isBuffer(data)) {
      if (existing.equals(data)) return;
    } else {
      if (existing.toString('utf8') === data) return;
    }
  } catch {
    // ignore
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, data);
}

async function generatePublicAssets() {
  ensureDir(PUBLIC_DIR);

  const svg = fs.readFileSync(SOURCE_SVG, 'utf8');
  await writeFileIfChanged(path.join(PUBLIC_DIR, 'icon.svg'), svg);

  const pwaSizes = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512];

  for (const size of pwaSizes) {
    const outPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
    const buf = await renderPaddedPngBuffer({ svgPath: SOURCE_SVG, size, scale: 0.86 });
    await writeFileIfChanged(outPath, buf);
  }
}

async function generateWindowsIco() {
  ensureDir(APP_DIR);

  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of icoSizes) {
    const buf = await renderPaddedPngBuffer({ svgPath: SOURCE_SVG, size, scale: 0.86 });
    pngBuffers.push(buf);
  }

  const ico = buildIcoFromPngBuffers(pngBuffers, icoSizes);

  await writeFileIfChanged(path.join(APP_DIR, 'icon.ico'), ico);
}

async function generatePublicIconsTouchPngs() {
  if (!fs.existsSync(PUBLIC_ICONS_DIR)) return;

  const entries = fs.readdirSync(PUBLIC_ICONS_DIR, { withFileTypes: true });
  const svgs = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.svg'))
    .map((e) => e.name);

  for (const name of svgs) {
    const svgPath = path.join(PUBLIC_ICONS_DIR, name);
    const outName = name.replace(/\.svg$/i, '-192.png');
    const outPath = path.join(PUBLIC_ICONS_DIR, outName);
    const buf = await renderPaddedPngBuffer({ svgPath, size: 192, scale: 0.86 });
    await writeFileIfChanged(outPath, buf);
  }
}

async function generateAndroidLegacyMipmaps() {
  const mipmaps = [
    { dir: 'mipmap-mdpi', px: 48 },
    { dir: 'mipmap-hdpi', px: 72 },
    { dir: 'mipmap-xhdpi', px: 96 },
    { dir: 'mipmap-xxhdpi', px: 144 },
    { dir: 'mipmap-xxxhdpi', px: 192 },
  ];

  for (const m of mipmaps) {
    const outDir = path.join(ANDROID_RES_DIR, m.dir);
    ensureDir(outDir);

    const buf = await renderPaddedPngBuffer({ svgPath: SOURCE_SVG, size: m.px, scale: 0.86 });

    await writeFileIfChanged(path.join(outDir, 'ic_launcher.png'), buf);
    await writeFileIfChanged(path.join(outDir, 'ic_launcher_round.png'), buf);
    await writeFileIfChanged(path.join(outDir, 'ic_launcher_foreground.png'), buf);
  }
}

async function main() {
  if (!fs.existsSync(SOURCE_SVG)) {
    throw new Error(`Missing source SVG: ${SOURCE_SVG}`);
  }

  console.log('Generating brand assets from:', SOURCE_SVG);

  await generatePublicAssets();
  await generatePublicIconsTouchPngs();
  await generateWindowsIco();
  await generateAndroidLegacyMipmaps();

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
