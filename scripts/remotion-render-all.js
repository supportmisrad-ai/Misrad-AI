/**
 * Render all Remotion video compositions.
 * Usage: node scripts/remotion-render-all.js [--social-only] [--tv-only] [--filter=System]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ENTRY = 'remotion/index.ts';
const OUT_DIR = path.join(__dirname, '..', 'out', 'videos');

const ALL_IDS = [
  'System', 'Nexus', 'Social', 'Finance', 'Client', 'Operations',
  'Solo', 'Closer', 'Authority', 'Operator', 'Empire', 'Mentor',
  'Registration', 'Navigation', 'AI-Action',
];

const args = process.argv.slice(2);
const socialOnly = args.includes('--social-only');
const tvOnly = args.includes('--tv-only');
const filterArg = args.find(a => a.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

const ids = filter
  ? ALL_IDS.filter(id => id.toLowerCase().includes(filter.toLowerCase()))
  : ALL_IDS;

if (ids.length === 0) {
  console.error(`No compositions matched filter: ${filter}`);
  process.exit(1);
}

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });

const formats = [];
if (!tvOnly) formats.push('Social');
if (!socialOnly) formats.push('TV');

const total = ids.length * formats.length;
let current = 0;

console.log(`\n🎬 Rendering ${total} videos...\n`);

for (const id of ids) {
  for (const format of formats) {
    current++;
    const compositionId = `${id}-${format}`;
    const outFile = path.join(OUT_DIR, `${compositionId}.mp4`);

    console.log(`[${current}/${total}] Rendering ${compositionId}...`);

    try {
      execSync(
        `npx remotion render ${ENTRY} ${compositionId} "${outFile}" --log=error`,
        { stdio: 'inherit', cwd: path.join(__dirname, '..') }
      );
      console.log(`  ✅ ${compositionId} → ${outFile}\n`);
    } catch (err) {
      console.error(`  ❌ Failed: ${compositionId}\n`);
    }
  }
}

console.log(`\n🎉 Done! ${current} videos rendered to ${OUT_DIR}\n`);
