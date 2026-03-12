const fs = require('fs');
let content = fs.readFileSync('bot/Rules_5.rules', 'utf8');

console.log('Starting Rule 22 update...\n');

// עדכון 1: שינוי כותרת Rule 22
const oldTitle = 'header:`*חבילת פרלינס — בדיוק בשבילך* 🎯`\\';
const newTitle = 'header:`*נקסוס בלבד — בדיוק בשבילך* 🎯`\\';

if (content.includes(oldTitle)) {
  content = content.replace(oldTitle, newTitle);
  console.log('✓ Updated title: חבילת פרלינס → נקסוס בלבד');
} else {
  console.log('⚠ Title not found, checking alternative...');
  // Try alternative format
  const altOldTitle = 'header:`*חבילת Solo — בדיוק בשבילך* 🎯`\\';
  if (content.includes(altOldTitle)) {
    content = content.replace(altOldTitle, newTitle);
    console.log('✓ Updated title (alt format): Solo → נקסוס בלבד');
  }
}

// עדכון 2: שינוי תיאור - הסרת "בחר מודול" והוספת תיאור נקסוס
// מחפש את החלק שמתחיל ב-description:`בדיוק מה שצריך.
const oldDescPattern = /description:`בדיוק מה שצריך\.\n\n💰 החל מ- \*149₪\/חודש\* \| שנתי: \*119₪\*\n📅 \*7 ימי ניסיון חינם\*\n\n`\\/;
const newDesc = 'description:`ניהול צוות ומשימות עם AI.\n\n💰 *149₪/חודש* | שנתי: *119₪*\n📅 *7 ימי ניסיון חינם*\n\n✅ משימות חכמות\n✅ דשבורד צוות\n✅ תזכורות AI\n\nרוצה יותר? חבילות משולבות מ-249₪\n`\\';

if (oldDescPattern.test(content)) {
  content = content.replace(oldDescPattern, newDesc);
  console.log('✓ Updated description with Nexus features');
} else {
  console.log('⚠ Description pattern not found - may need manual check');
}

// בדיקת תקינות JSON
try {
  JSON.parse(content);
  console.log('\n✓ JSON validation passed');
  
  // שמירה
  fs.writeFileSync('bot/Rules_5.rules', content, 'utf8');
  console.log('✓ File saved successfully');
  console.log('\n=== Summary ===');
  console.log('Rule 22 updated: נקסוס בלבד');
  console.log('Main menu: Already updated');
  
} catch (e) {
  console.error('\n❌ JSON validation FAILED:', e.message);
  console.log('No changes saved - original preserved');
}
