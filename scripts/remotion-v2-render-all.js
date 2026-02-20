/**
 * Render all Remotion V2 video compositions.
 * Usage: node scripts/remotion-v2-render-all.js [--social-only] [--tv-only] [--tutorials-only] [--filter=System]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ENTRY = 'remotion-v2/index.ts';
const OUT_DIR = path.join(__dirname, '..', 'out', 'videos-v2');

// Dual compositions — rendered in both Social (9:16) and TV (16:9) formats
const DUAL_IDS = [
  // A: Module videos
  'V2-System', 'V2-Nexus', 'V2-Social', 'V2-Finance', 'V2-Client', 'V2-Operations',
  // B: Package videos
  'V2-Solo', 'V2-Closer', 'V2-Authority', 'V2-Operator', 'V2-Empire', 'V2-Mentor',
  // C: UI Demo videos
  'V2-Navigation', 'V2-Registration', 'V2-AIAction',
  // D: Bonus videos
  'V2-BrandStory', 'V2-AIShowcase', 'V2-ShabbatMode',
];

// Tutorial compositions — IDs already include Desktop/Mobile suffix
const TUTORIAL_IDS = [
  'Tutorial-System-Leads-Desktop',     'Tutorial-System-Leads-Mobile',
  'Tutorial-System-Dialer-Desktop',    'Tutorial-System-Dialer-Mobile',
  'Tutorial-Nexus-Employee-Desktop',   'Tutorial-Nexus-Employee-Mobile',
  'Tutorial-Nexus-Tasks-Desktop',      'Tutorial-Nexus-Tasks-Mobile',
  'Tutorial-Finance-Invoice-Desktop',  'Tutorial-Finance-Invoice-Mobile',
  'Tutorial-Social-Post-Desktop',      'Tutorial-Social-Post-Mobile',
  'Tutorial-Operations-Inventory-Desktop', 'Tutorial-Operations-Inventory-Mobile',
  'Tutorial-Client-Portal-Desktop',    'Tutorial-Client-Portal-Mobile',
];

const args = process.argv.slice(2);
const socialOnly     = args.includes('--social-only');
const tvOnly         = args.includes('--tv-only');
const tutorialsOnly  = args.includes('--tutorials-only');
const noTutorials    = args.includes('--no-tutorials');
const filterArg      = args.find(a => a.startsWith('--filter='));
const filter         = filterArg ? filterArg.split('=')[1] : null;

// Build the full list of composition IDs to render
const compositionIds = [];

if (!tutorialsOnly) {
  const formats = [];
  if (!tvOnly) formats.push('Social');
  if (!socialOnly) formats.push('TV');

  for (const id of DUAL_IDS) {
    if (filter && !id.toLowerCase().includes(filter.toLowerCase())) continue;
    for (const fmt of formats) {
      compositionIds.push(`${id}-${fmt}`);
    }
  }
}

if (!noTutorials) {
  for (const id of TUTORIAL_IDS) {
    if (filter && !id.toLowerCase().includes(filter.toLowerCase())) continue;
    compositionIds.push(id);
  }
}

if (compositionIds.length === 0) {
  console.error(filter ? `No compositions matched filter: ${filter}` : 'Nothing to render.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const total = compositionIds.length;
let done = 0;
let failed = 0;

console.log(`\n🎬 Rendering ${total} V2 videos...\n`);

for (const compositionId of compositionIds) {
  done++;
  const outFile = path.join(OUT_DIR, `${compositionId}.mp4`);
  console.log(`[${done}/${total}] ${compositionId}...`);

  try {
    execSync(
      `npx.cmd remotion render ${ENTRY} ${compositionId} "${outFile}" --log=error`,
      { stdio: 'inherit', cwd: path.join(__dirname, '..') }
    );
    console.log(`  ✅ → ${outFile}\n`);
  } catch {
    console.error(`  ❌ Failed: ${compositionId}\n`);
    failed++;
  }
}

console.log(`\n🎉 Done! ${done - failed}/${total} rendered to ${OUT_DIR}`);
if (failed > 0) console.warn(`⚠️  ${failed} failed — check errors above.`);
