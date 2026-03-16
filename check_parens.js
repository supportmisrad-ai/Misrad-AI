const fs = require('fs');

const content = fs.readFileSync('components/client-os-full/components/client-tabs/ClientMeetingsTab.tsx', 'utf8');
const lines = content.split(/\r?\n/);

let braceCount = 0;
let parenCount = 0;
let inJSX = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prev = line[j-1];
    const next = line[j+1];
    
    // Track JSX expressions { ... }
    if (char === '{' && !inJSX && next !== "'" && next !== '"') {
      inJSX = true;
      braceCount++;
      console.log(`Line ${i+1} col ${j+1}: { opens, brace=${braceCount}, paren=${parenCount}`);
    } else if (char === '}' && inJSX && prev !== "'" && prev !== '"') {
      braceCount--;
      console.log(`Line ${i+1} col ${j+1}: } closes, brace=${braceCount}, paren=${parenCount}`);
      if (braceCount === 0) inJSX = false;
    } else if (inJSX && char === '(') {
      parenCount++;
      console.log(`Line ${i+1} col ${j+1}: ( opens, brace=${braceCount}, paren=${parenCount}`);
    } else if (inJSX && char === ')') {
      parenCount--;
      console.log(`Line ${i+1} col ${j+1}: ) closes, brace=${braceCount}, paren=${parenCount}`);
    }
  }
}

console.log('\nFinal:', { braceCount, parenCount });
