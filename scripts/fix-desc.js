const fs = require('fs');
let content = fs.readFileSync('bot/Rules_5.rules', 'utf8');

console.log('Updating Rule 22 description...\n');

// חיפוש גמיש יותר - רק את המילים הראשונות ומחליף הכל עד ה-footer
const targetStart = 'description:`בדיוק מה שצריך.';
const targetEnd = '`\\footer:``';

if (content.includes(targetStart)) {
  // מצא את האינדקס של התחלה וסוף
  const startIdx = content.indexOf(targetStart);
  const endIdx = content.indexOf(targetEnd, startIdx);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const oldText = content.substring(startIdx, endIdx + targetEnd.length);
    
    const newText = `description:`ניהול צוות ומשימות עם AI.

💰 *149₪/חודש* | שנתי: *119₪*
📅 *7 ימי ניסיון חינם*

✅ משימות חכמות
✅ דשבורד צוות  
✅ תזכורות AI

רוצה יותר? חבילות משולבות מ-249₪
${targetEnd}`;
    
    content = content.replace(oldText, newText);
    console.log('✓ Description updated successfully');
    
    // בדיקת תקינות
    try {
      JSON.parse(content);
      fs.writeFileSync('bot/Rules_5.rules', content, 'utf8');
      console.log('✓ Saved with new description');
    } catch (e) {
      console.error('❌ JSON error:', e.message);
    }
  } else {
    console.log('⚠ Could not find end pattern');
  }
} else {
  console.log('⚠ Start pattern not found');
}
