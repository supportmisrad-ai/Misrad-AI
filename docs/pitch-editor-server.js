const http = require('http');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'INVESTOR-PITCH-DECK-v2.html');
const PORT = 3333;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(HTML_FILE, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { html } = JSON.parse(body);
        fs.writeFileSync(HTML_FILE, html, 'utf-8');
        console.log(`[${new Date().toLocaleTimeString('he-IL')}] נשמר בהצלחה ✓`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('שגיאה:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  ✏️  עורך Pitch Deck פעיל:`);
  console.log(`  📄 http://localhost:${PORT}`);
  console.log(`  💾 שמירה: Ctrl+S מתוך הדף\n`);
});
