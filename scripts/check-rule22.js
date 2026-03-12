const fs = require('fs');
const rules = JSON.parse(fs.readFileSync('bot/Rules_5.rules', 'utf8'));

// מצא את Rule 22
const rule22 = rules.find(r => r.Rule && r.Rule.includes('22##'));
if (rule22) {
  console.log('Rule 22 found:');
  console.log('Rule field:', rule22.Rule);
  console.log('\nResponse (first 500 chars):');
  console.log(rule22.response.substring(0, 500));
} else {
  console.log('Rule 22 not found');
}

// בדוק גם את התפריט הראשי (Rule 1)
const rule1 = rules.find(r => r.Rule && r.Rule.includes('1##התחל'));
if (rule1) {
  console.log('\n\n=== Rule 1 - Main Menu ===');
  const descMatch = rule1.response.match(/description:`([^`]+)`/g);
  if (descMatch) {
    descMatch.forEach(d => console.log(d));
  }
}
