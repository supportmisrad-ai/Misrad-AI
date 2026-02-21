'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

function getPage(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', () => resolve(0));
    req.setTimeout(30000, () => { req.destroy(); resolve(0); });
  });
}

async function main() {
  console.log('Loading page...');
  await getPage('http://localhost:4000/login');
  await new Promise(r => setTimeout(r, 2000));

  const file = path.join(__dirname, '..', '.next', 'dev', 'static', 'chunks', 'app', 'layout.js');
  if (!fs.existsSync(file)) { console.log('layout.js not found'); return; }

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log('Total lines:', lines.length);

  // Find all eval() lines and test them for syntax errors
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('eval(')) continue;

    // Try to execute as JS to find syntax error
    try {
      new Function(line);
    } catch (e) {
      console.log(`\nLINE ${i+1} (${line.length} chars) - ERROR: ${e.message}`);

      // Find the exact position
      const posMatch = e.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        console.log(`  Char at pos ${pos}: code=${line.charCodeAt(pos)} char="${line[pos]}"`);
        console.log(`  Context: ...${JSON.stringify(line.substring(Math.max(0,pos-40), pos+40))}...`);
      }

      // Also check col 29 (from browser error)
      const col28 = 28; // 0-indexed
      if (line.length > col28) {
        console.log(`  Col 29 char: code=${line.charCodeAt(col28)} char="${line[col28]}"`);
        console.log(`  Col 29 context: ${JSON.stringify(line.substring(Math.max(0,col28-20), col28+20))}`);
      }

      // Show module identity
      const modMatch = line.match(/"[^"]{10,100}@clerk[^"]{0,100}"/);
      if (modMatch) console.log('  Module:', modMatch[0].substring(0,80));
    }
  }

  console.log('\nDone.');
}
main().catch(e => console.error(e.message));
