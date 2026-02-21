'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '.next', 'dev', 'static', 'chunks', 'app', 'layout.js');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Find the problematic line (around 128-150)
for (let lineNum = 125; lineNum <= 155 && lineNum < lines.length; lineNum++) {
  const line = lines[lineNum];
  console.log(`\nLINE ${lineNum + 1} (len=${line.length}):`);
  
  if (line.length > 10000) {
    // This is the massive eval line - extract the eval content and try to parse it
    console.log('  [MASSIVE LINE - analyzing eval content]');
    
    // Extract the string inside eval()
    const evalStart = line.indexOf('eval(');
    if (evalStart === -1) { console.log('  No eval() found'); continue; }
    
    // Try to find syntax errors by evaluating chunks
    const innerStart = line.indexOf('"', evalStart);
    const evalStr = line.substring(evalStart);
    
    // Look for unescaped special characters
    let inString = false;
    let stringChar = '';
    let escaped = false;
    let suspiciousChars = [];
    
    for (let i = 0; i < Math.min(evalStr.length, 500000); i++) {
      const c = evalStr.charCodeAt(i);
      // Look for null bytes, BOM, or other control chars
      if (c === 0 || c === 0xFEFF || (c < 32 && c !== 10 && c !== 13 && c !== 9)) {
        suspiciousChars.push({ pos: i, char: evalStr[i], code: c, context: evalStr.substring(Math.max(0, i-30), i+30) });
      }
    }
    
    if (suspiciousChars.length > 0) {
      console.log('  SUSPICIOUS CHARS FOUND:');
      for (const sc of suspiciousChars.slice(0, 10)) {
        console.log(`    pos=${sc.pos} code=U+${sc.code.toString(16).padStart(4,'0')} context: ...${JSON.stringify(sc.context)}...`);
      }
    } else {
      console.log('  No suspicious control chars in first 500k chars');
    }
    
    // Also check the heIL locale section specifically
    const heILIdx = evalStr.indexOf('heIL');
    if (heILIdx > -1) {
      console.log(`  heIL found at pos ${heILIdx}`);
      // Check around heIL for issues
      const heSection = evalStr.substring(heILIdx, heILIdx + 5000);
      for (let i = 0; i < heSection.length; i++) {
        const c = heSection.charCodeAt(i);
        if (c === 0 || c === 0xFEFF || (c < 32 && c !== 10 && c !== 13 && c !== 9)) {
          console.log(`  heIL section suspicious: pos=${heILIdx+i} code=U+${c.toString(16).padStart(4,'0')}`);
        }
      }
    }
    
    // Try to actually parse the eval content
    console.log('\n  Attempting to find syntax error...');
    // The eval content is wrapped in __webpack_require__.ts("...")
    const tsStart = evalStr.indexOf('__webpack_require__.ts("');
    if (tsStart > -1) {
      const strStart = evalStr.indexOf('"', tsStart + 23);
      // Find the closing of the ts() call - this is complex, try a different approach
      // Just try to eval/parse the whole thing and catch the error
      try {
        new Function(evalStr.substring(evalStart + 5, evalStr.length - 3));
        console.log('  No syntax error detected by Function constructor!');
      } catch (e) {
        console.log('  SYNTAX ERROR:', e.message);
        // Try to find the exact position
        const match = e.message.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1]);
          console.log(`  Error at position ${pos}: ...${evalStr.substring(Math.max(0,pos-50), pos+50)}...`);
        }
      }
    }
  } else {
    console.log('  ' + line.substring(0, 200));
  }
}
