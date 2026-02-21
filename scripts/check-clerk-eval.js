'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

// First trigger a page load to compile layout.js
function getPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject).setTimeout(30000, () => reject(new Error('timeout')));
  });
}

async function main() {
  console.log('Triggering page load to compile layout.js...');
  try {
    const status = await getPage('http://localhost:4000/login');
    console.log('HTTP status:', status);
  } catch (e) {
    console.log('Page load error:', e.message);
  }

  await new Promise(r => setTimeout(r, 3000));

  const file = path.join(__dirname, '..', '.next', 'dev', 'static', 'chunks', 'app', 'layout.js');
  if (!fs.existsSync(file)) {
    console.log('layout.js not found — not compiled yet');
    return;
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log('layout.js lines:', lines.length);

  let clerkEvalCount = 0;
  let maxClerkEvalLen = 0;
  let syntaxErrors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('eval(')) continue;
    if (!line.includes('@clerk')) continue;

    clerkEvalCount++;
    if (line.length > maxClerkEvalLen) maxClerkEvalLen = line.length;

    // Try to detect syntax error
    if (line.length > 50000) {
      try {
        new Function(line);
      } catch (e) {
        syntaxErrors.push({ line: i + 1, len: line.length, err: e.message.substring(0, 80) });
      }
    }
  }

  console.log('\n@clerk modules still in eval():', clerkEvalCount);
  console.log('Max @clerk eval line length:', maxClerkEvalLen);

  if (clerkEvalCount === 0) {
    console.log('\n✅ SUCCESS: No @clerk/ modules wrapped in eval() — SyntaxError fixed!');
  } else {
    console.log('\n❌ @clerk/ modules still eval-wrapped. EvalSourceMapDevToolPlugin exclude not working.');
    for (const e of syntaxErrors) {
      console.log(`  LINE ${e.line} (${e.len} chars): ${e.err}`);
    }
  }
}

main().catch(e => console.error('Error:', e.message));
