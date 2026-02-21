'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '.next', 'dev', 'static', 'chunks', 'app', 'layout.js');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Check both suspicious lines
for (const lineNum of [127, 149]) {
  const line = lines[lineNum];
  if (line.length < 1000) continue;
  
  console.log(`\n=== LINE ${lineNum + 1} (${line.length} chars) ===`);
  
  // The line format is: eval(__webpack_require__.ts("...CONTENT...\n//# sourceURL=...\n"));
  // The outer quotes are double quotes, so an unescaped double quote inside will break it
  
  // Find the opening " of the ts() call
  const tsIdx = line.indexOf('__webpack_require__.ts("');
  if (tsIdx === -1) { console.log('No ts() found'); continue; }
  
  const contentStart = tsIdx + '__webpack_require__.ts("'.length;
  
  // Walk through the string looking for unescaped " that would terminate the eval
  let pos = contentStart;
  let escapeCount = 0;
  
  while (pos < line.length) {
    const ch = line[pos];
    
    if (ch === '\\') {
      // Count consecutive backslashes
      let bsCount = 0;
      while (pos < line.length && line[pos] === '\\') {
        bsCount++;
        pos++;
      }
      // If odd number of backslashes followed by ", the " is escaped
      // If even number, the " is NOT escaped (backslashes cancel each other)
      if (pos < line.length && line[pos] === '"') {
        if (bsCount % 2 === 0) {
          // Unescaped double quote! This breaks the eval
          const context = line.substring(Math.max(contentStart, pos - 80), Math.min(line.length, pos + 80));
          console.log(`FOUND UNESCAPED " at pos ${pos} (${bsCount} backslashes before it)`);
          console.log(`Context: ...${context}...`);
          // Check if this is the closing quote of the ts() call or a premature break
          const after = line.substring(pos, pos + 50);
          console.log(`After: ${after}`);
          break;
        }
      }
      continue;
    }
    
    if (ch === '"') {
      // Unescaped " — this should be the end of the ts() string
      const remaining = line.substring(pos, Math.min(line.length, pos + 100));
      const before = line.substring(Math.max(contentStart, pos - 100), pos);
      console.log(`Found unescaped " at pos ${pos}`);
      console.log(`Before: ...${before}`);
      console.log(`After:  ${remaining.substring(0, 100)}`);
      
      // Check if there's still content after this that shouldn't be there
      const afterClose = line.substring(pos + 1, pos + 20);
      if (afterClose.startsWith('));') || afterClose.startsWith('\\n//# source')) {
        console.log('=> This is the LEGITIMATE closing quote');
      } else {
        console.log('=> PREMATURE closing quote - THIS IS THE BUG');
      }
      break;
    }
    
    pos++;
  }
}

// Also check: does the heIL locale source file have problematic chars?
console.log('\n=== Checking @clerk/localizations source ===');
const locFile = path.join(__dirname, '..', 'node_modules', '@clerk', 'localizations', 'dist', 'index.mjs');
if (fs.existsSync(locFile)) {
  const locContent = fs.readFileSync(locFile, 'utf8');
  console.log(`File size: ${locContent.length} chars`);
  
  // Check for backticks (template literals) which can cause issues in eval
  const backtickPositions = [];
  for (let i = 0; i < locContent.length; i++) {
    if (locContent[i] === '`') backtickPositions.push(i);
  }
  console.log(`Backticks found: ${backtickPositions.length}`);
  for (const bp of backtickPositions.slice(0, 5)) {
    console.log(`  pos ${bp}: ...${locContent.substring(Math.max(0, bp-40), bp+40)}...`);
  }
  
  // Check for unescaped special chars that might break eval
  let problemChars = 0;
  for (let i = 0; i < locContent.length; i++) {
    const c = locContent.charCodeAt(i);
    if (c === 0 || c === 0xFEFF || c === 0x2028 || c === 0x2029) {
      console.log(`Problem char at ${i}: U+${c.toString(16).padStart(4, '0')}`);
      problemChars++;
    }
  }
  if (problemChars === 0) console.log('No known problem Unicode chars (U+2028/U+2029/BOM/null)');
} else {
  console.log('File not found:', locFile);
}
