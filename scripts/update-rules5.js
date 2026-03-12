const fs = require('fs');

// קריאת הקובץ
let content = fs.readFileSync('bot/Rules_5.rules', 'utf8');
const originalLength = content.length;

console.log('Starting update...');
console.log('Original file size:', originalLength);

let changes = [];

// עדכון 1: Rule 22 - שינוי "חבילת Solo" ל"נקסוס בלבד"
const oldSoloTitle = 'header:`*חבילת Solo — בדיוק בשבילך* 🎯`\\';
const newSoloTitle = 'header:`*נקסוס בלבד — בדיוק בשבילך* 🎯`\\';
if (content.includes(oldSoloTitle)) {
  content = content.replace(oldSoloTitle, newSoloTitle);
  changes.push('✓ Updated Rule 22 title: Solo → נקסוס בלבד');
} else {
  changes.push('⚠ Rule 22 title not found (may already be updated)');
}

// עדכון 2: הסרת "בחר מודול" מתיאור Rule 22
const oldModules = `בחר מודול:
• System — מכירות
• Social — שיווק
• Client OS — לקוחות
• Operations — תפעול`;

const newModules = `מודול ניהול צוות ומשימות עם AI.
באפשרותך לשדרג לחבילה משולבת בכל עת.`;

if (content.includes(oldModules)) {
  content = content.replace(oldModules, newModules);
  changes.push('✓ Updated Rule 22 description: removed module selection');
} else {
  changes.push('⚠ Rule 22 modules text not found');
}

// עדכון 3: שינוי "4 חבילות, מ-149₪" בתפריט ראשי
const oldMenuDesc = 'description:`4 חבילות, מ-149₪`';
const newMenuDesc = 'description:`נקסוס בלבד ₪149, חבילות מ-₪249`';
if (content.includes(oldMenuDesc)) {
  content = content.replace(oldMenuDesc, newMenuDesc);
  changes.push('✓ Updated main menu description');
} else {
  changes.push('⚠ Main menu description not found');
}

// בדיקה שהקובץ עדיין תקין JSON
try {
  JSON.parse(content);
  console.log('✓ JSON validation passed');
} catch (e) {
  console.error('❌ JSON validation FAILED:', e.message);
  console.log('Changes aborted - original file preserved');
  process.exit(1);
}

// שמירה
fs.writeFileSync('bot/Rules_5.rules', content, 'utf8');
console.log('\n=== Changes Summary ===');
changes.forEach(c => console.log(c));
console.log('\nFile size change:', originalLength, '→', content.length);
console.log('Update complete!');
