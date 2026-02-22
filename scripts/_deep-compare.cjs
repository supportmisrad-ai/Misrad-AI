const fs = require('fs');

const profilesDir = 'c:/Users/USER/OneDrive/מסמכים/WAAM-It Blaster/Profiles';
const ourPath = 'c:/Projects/Misrad-AI/bot/Rules_2.rules';

function loadRules(p) {
  const raw = fs.readFileSync(p);
  const str = raw.toString().replace(/^\uFEFF/, '');
  try { return { path: p, raw, str, data: JSON.parse(str), count: JSON.parse(str).length }; }
  catch(e) { return { path: p, raw, str, data: null, count: 0, error: e.message }; }
}

// PHASE 1: Thorough value-by-value comparison between working files and ours
console.log('====================================');
console.log('  THOROUGH FORMAT VALIDATION');
console.log('====================================');

// 1) All Profiles files
console.log('=== ALL PROFILES .rules FILES ===');
const working = [];
for (let i = 1; i <= 10; i++) {
  const p = `${profilesDir}/Rules_${i}.rules`;
  if (fs.existsSync(p)) {
    const r = loadRules(p);
    console.log(`  Rules_${i}: ${r.raw.length} bytes, ${r.count} rules, BOM=[${r.raw[0]},${r.raw[1]},${r.raw[2]}], last3=[${r.raw[r.raw.length-3]},${r.raw[r.raw.length-2]},${r.raw[r.raw.length-1]}]`);
    if (r.count > 0) working.push({ idx: i, ...r });
  }
}

const ours = loadRules(ourPath);
console.log(`\n  OURS: ${ours.raw.length} bytes, ${ours.count} rules, BOM=[${ours.raw[0]},${ours.raw[1]},${ours.raw[2]}], last3=[${ours.raw[ours.raw.length-3]},${ours.raw[ours.raw.length-2]},${ours.raw[ours.raw.length-1]}]`);

// 2) Pick a working file and do FULL structural comparison
if (working.length === 0) { console.log('NO working profiles found!'); process.exit(1); }
const ref = working[0];
console.log(`\n=== COMPARING Rules_${ref.idx} (${ref.count} rules, WORKING) vs OURS (${ours.count} rules) ===`);

// Key order
const refKeys = Object.keys(ref.data[0]);
const ourKeys = Object.keys(ours.data[0]);
console.log('\nTop keys match:', JSON.stringify(refKeys) === JSON.stringify(ourKeys));
if (JSON.stringify(refKeys) !== JSON.stringify(ourKeys)) {
  console.log('  REF:', JSON.stringify(refKeys));
  console.log('  OUR:', JSON.stringify(ourKeys));
  // Show missing/extra
  for (const k of refKeys) if (!ourKeys.includes(k)) console.log(`  MISSING in ours: "${k}"`);
  for (const k of ourKeys) if (!refKeys.includes(k)) console.log(`  EXTRA in ours: "${k}"`);
}

const refExKeys = Object.keys(ref.data[0].extra);
const ourExKeys = Object.keys(ours.data[0].extra);
console.log('Extra keys match:', JSON.stringify(refExKeys) === JSON.stringify(ourExKeys));
if (JSON.stringify(refExKeys) !== JSON.stringify(ourExKeys)) {
  console.log('  REF:', JSON.stringify(refExKeys));
  console.log('  OUR:', JSON.stringify(ourExKeys));
  for (const k of refExKeys) if (!ourExKeys.includes(k)) console.log(`  MISSING in ours: extra."${k}"`);
  for (const k of ourExKeys) if (!refExKeys.includes(k)) console.log(`  EXTRA in ours: extra."${k}"`);
}

// Value types for EVERY key
console.log('\n=== VALUE TYPE CHECK (all rules, not just rule 0) ===');
for (let ri = 0; ri < Math.min(ref.data.length, 5); ri++) {
  const rr = ref.data[ri];
  for (const k of Object.keys(rr)) {
    if (k === 'extra') continue;
    const v = rr[k];
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    // Check same key in our rule 0 for type
    if (ri === 0 && ours.data[0][k] !== undefined) {
      const ov = ours.data[0][k];
      const ot = ov === null ? 'null' : Array.isArray(ov) ? 'array' : typeof ov;
      if (t !== ot) console.log(`  TYPE DIFF [${ri}].${k}: ref=${t} ours=${ot}`);
    }
  }
}

// Full Rule 0 from ref
console.log('\n=== REF RULE 0 (Rules_' + ref.idx + ') ===');
console.log(JSON.stringify(ref.data[0], null, 2));

// Full Rule 0 from ours
console.log('\n=== OUR RULE 0 ===');
console.log(JSON.stringify(ours.data[0], null, 2));

// Separator rules in ref
console.log('\n=== SEPARATOR RULES IN REF ===');
ref.data.forEach((r, i) => {
  if (r.Rule.match(/^-+$/)) {
    console.log(`  [${i}] dashes=${r.Rule.length} response=${JSON.stringify(r.response)} contains=${r.contains}`);
  }
});
console.log('\n=== SEPARATOR RULES IN OURS ===');
ours.data.forEach((r, i) => {
  if (r.Rule.match(/^-+$/)) {
    console.log(`  [${i}] dashes=${r.Rule.length} response=${JSON.stringify(r.response)} contains=${r.contains}`);
  }
});

// Check if file ends exactly right
console.log('\n=== FILE ENDING ===');
console.log('REF last 10 chars:', JSON.stringify(ref.str.slice(-10)));
console.log('OUR last 10 chars:', JSON.stringify(ours.str.slice(-10)));
console.log('REF ends with ]:', ref.str.trimEnd().endsWith(']'));
console.log('OUR ends with ]:', ours.str.trimEnd().endsWith(']'));
