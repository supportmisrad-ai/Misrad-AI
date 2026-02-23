const fs = require('fs');

const r2Path = 'c:/Users/USER/OneDrive/מסמכים/WAAM-It Blaster/Profiles/Rules_2.rules';
const r5Path = 'c:/Users/USER/OneDrive/מסמכים/WAAM-It Blaster/Profiles/Rules_5.rules';

function loadRules(p) {
  const raw = fs.readFileSync(p);
  const str = raw.toString().replace(/^\uFEFF/, '');
  return { path: p, raw, str, data: JSON.parse(str) };
}

const r2 = loadRules(r2Path);
const r5 = loadRules(r5Path);

console.log('=== FILE LEVEL ===');
console.log('R2 size:', r2.raw.length, 'bytes,', r2.data.length, 'rules');
console.log('R5 size:', r5.raw.length, 'bytes,', r5.data.length, 'rules');
console.log('R2 BOM:', [r2.raw[0], r2.raw[1], r2.raw[2]]);
console.log('R5 BOM:', [r5.raw[0], r5.raw[1], r5.raw[2]]);

console.log('\n=== RULE 0 DETAILED ===');
const keys2 = Object.keys(r2.data[0]);
const keys5 = Object.keys(r5.data[0]);
console.log('Keys order match:', JSON.stringify(keys2) === JSON.stringify(keys5));

// Compare every field
for (const k of keys2) {
  if (k === 'extra') continue;
  const v2 = r2.data[0][k];
  const v5 = r5.data[0][k];
  const t2 = v2 === null ? 'null' : Array.isArray(v2) ? 'array' : typeof v2;
  const t5 = v5 === null ? 'null' : Array.isArray(v5) ? 'array' : typeof v5;
  
  if (t2 !== t5 || JSON.stringify(v2) !== JSON.stringify(v5)) {
    console.log(`\nDIFF in "${k}":`);
    console.log('  R2:', t2, JSON.stringify(v2).substring(0, 100));
    console.log('  R5:', t5, JSON.stringify(v5).substring(0, 100));
  }
}

// Extra fields
const ex2 = Object.keys(r2.data[0].extra);
const ex5 = Object.keys(r5.data[0].extra);
console.log('\nExtra keys order match:', JSON.stringify(ex2) === JSON.stringify(ex5));

for (const k of ex2) {
  const v2 = r2.data[0].extra[k];
  const v5 = r5.data[0].extra[k];
  const t2 = v2 === null ? 'null' : typeof v2;
  const t5 = v5 === null ? 'null' : typeof v5;
  
  if (t2 !== t5 || JSON.stringify(v2) !== JSON.stringify(v5)) {
    console.log(`\nDIFF in extra."${k}":`);
    console.log('  R2:', t2, JSON.stringify(v2).substring(0, 100));
    console.log('  R5:', t5, JSON.stringify(v5).substring(0, 100));
  }
}

// Check separator rules
console.log('\n=== SEPARATOR RULES ===');
const sep2 = r2.data.filter(r => r.Rule.match(/^-+$/));
const sep5 = r5.data.filter(r => r.Rule.match(/^-+$/));
console.log('R2 separators:', sep2.length);
if (sep2.length > 0) console.log('  First sep dashes:', sep2[0].Rule.length);
console.log('R5 separators:', sep5.length);
if (sep5.length > 0) console.log('  First sep dashes:', sep5[0].Rule.length);

// Check _Date format across all rules
console.log('\n=== _Date FORMAT SAMPLE ===');
console.log('R2 rule[0]._Date:', r2.data[0]._Date);
console.log('R2 rule[1]._Date:', r2.data[1]._Date);
console.log('R5 rule[0]._Date:', r5.data[0]._Date);
if (r5.data[1]) console.log('R5 rule[1]._Date:', r5.data[1]._Date);

// Check Color field
console.log('\n=== Color FIELD ===');
const colors2 = [...new Set(r2.data.map(r => r.Color))];
const colors5 = [...new Set(r5.data.map(r => r.Color))];
console.log('R2 unique Colors:', colors2);
console.log('R5 unique Colors:', colors5);

// Full Rule 0 dump
console.log('\n=== FULL R2 RULE 0 ===');
console.log(JSON.stringify(r2.data[0], null, 2).substring(0, 1500));
console.log('\n=== FULL R5 RULE 0 ===');
console.log(JSON.stringify(r5.data[0], null, 2).substring(0, 1500));
