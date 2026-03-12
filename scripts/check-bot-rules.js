const fs = require('fs');

// קריאת הקובץ
const content = fs.readFileSync('bot/Rules_5.rules', 'utf8');
console.log('File loaded:', content.length, 'chars');

// בדיקה אם הקובץ תקין
try {
  const rules = JSON.parse(content);
  console.log('Valid JSON with', rules.length, 'rules');
  
  // מציאת Rule 22
  const rule22 = rules.find(r => r.Rule && r.Rule.includes('22##אני לבד'));
  if (rule22) {
    console.log('\nFound Rule 22:', rule22.Rule);
    console.log('Current response preview:');
    console.log(rule22.response.substring(0, 200));
  }
  
  // מציאת כללים שמכילים 'Solo' או 'בחר מודול'
  const soloRules = rules.filter(r => 
    (r.response && r.response.includes('Solo')) ||
    (r.response && r.response.includes('בחר מודול'))
  );
  
  console.log('\nRules containing Solo or בחר מודול:', soloRules.length);
  soloRules.forEach(r => console.log(' - Rule:', r.Rule.substring(0, 50)));
  
} catch (e) {
  console.error('JSON parse error:', e.message);
}
