/**
 * יצירת HTML מאוחד מותאם לייבוא ל-Google Docs
 * כולל שער, תוכן עניינים, כל 25 הפרקים + נספחים
 * 
 * שימוש:
 *   node scripts/create-sales-html-for-gdocs.js
 * 
 * ייבוא ל-Google Docs:
 *   1. פתח Google Drive
 *   2. New → File Upload → בחר את הקובץ
 *   3. לחץ עליו → Open with Google Docs
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SALES_DOCS_DIR = path.join(__dirname, '..', 'docs', 'sales-docs');
const OUTPUT_DIR = path.join(SALES_DOCS_DIR, 'word');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'Misrad-AI-Sales-Complete.html');

const FILE_ORDER = [
  { path: '01-סקירה-כללית.md', title: 'סקירה כללית', icon: '🎯' },
  { path: '02-ארכיטקטורה-טכנית.md', title: 'ארכיטקטורה טכנית', icon: '🏗️' },
  { path: '03-מודל-נתונים.md', title: 'מודל נתונים', icon: '🗄️' },
  { path: '04-מודול-nexus.md', title: 'מודול Nexus — ניהול וצוות', icon: '📊' },
  { path: '05-מודול-system.md', title: 'מודול System — מכירות ו-CRM', icon: '💼' },
  { path: '06-מודול-social.md', title: 'מודול Social — שיווק ותוכן', icon: '📱' },
  { path: '07-מודול-finance.md', title: 'מודול Finance — כספים', icon: '💰' },
  { path: '08-מודול-client.md', title: 'מודול Client — לקוחות', icon: '👥' },
  { path: '09-מודול-operations.md', title: 'מודול Operations — תפעול', icon: '🔧' },
  { path: '10-מבנה-תמחור.md', title: 'מבנה תמחור', icon: '💲' },
  { path: '11-החבילות.md', title: 'החבילות — פירוט מלא', icon: '📦' },
  { path: '12-דוגמאות-מחיר.md', title: 'דוגמאות מחיר', icon: '🧮' },
  { path: '13-שכבות-אבטחה.md', title: 'שכבות אבטחה', icon: '🔒' },
  { path: '14-אימות-והרשאות.md', title: 'אימות והרשאות', icon: '🔑' },
  { path: '15-הגנת-נתונים.md', title: 'הגנת נתונים ופרטיות', icon: '🛡️' },
  { path: '16-יכולות-ai.md', title: 'יכולות AI', icon: '🤖' },
  { path: '17-אינטגרציות.md', title: 'אינטגרציות', icon: '🔗' },
  { path: '18-התנגדויות.md', title: 'התנגדויות ותשובות', icon: '❓' },
  { path: '19-תהליך-הטמעה.md', title: 'תהליך הטמעה', icon: '🚀' },
  { path: '20-קהל-יעד.md', title: 'קהל יעד', icon: '🎯' },
  // נספחים
  { path: path.join('נספחים', '21-השוואת-מתחרים.md'), title: 'נספח: השוואת מתחרים', icon: '📎' },
  { path: path.join('נספחים', '22-סקריפט-דמו.md'), title: 'נספח: סקריפט דמו', icon: '📎' },
  { path: path.join('נספחים', '23-שאלות-נפוצות.md'), title: 'נספח: שאלות נפוצות', icon: '📎' },
  { path: path.join('נספחים', '24-roadmap.md'), title: 'נספח: Roadmap', icon: '📎' },
  { path: path.join('נספחים', '25-מילון-מונחים.md'), title: 'נספח: מילון מונחים', icon: '📎' },
];

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n📄 מייצר HTML מאוחד ל-Google Docs...\n');

  // --- Cover page ---
  let html = `
<div style="text-align:center; margin-top:100px; margin-bottom:80px;">
  <h1 style="font-size:42px; color:#1a365d;">Misrad-AI</h1>
  <h2 style="font-size:24px; color:#2b6cb0; font-weight:normal;">מסמך מכירה מלא</h2>
  <p style="font-size:16px; color:#718096;">פלטפורמת ניהול עסקי All-in-One</p>
  <p style="font-size:14px; color:#a0aec0;">גרסה 3.0 — פברואר 2026</p>
</div>
<hr style="border:none; border-top:2px solid #2b6cb0; margin:40px 0;">
`;

  // --- TOC ---
  html += `<h1 style="font-size:24px; color:#1a365d; border-bottom:2px solid #2b6cb0; padding-bottom:8px;">📋 תוכן עניינים</h1>\n`;
  html += `<table style="width:100%; border:none; border-collapse:collapse;">\n`;

  FILE_ORDER.forEach((entry, i) => {
    const isAppendix = entry.path.includes('נספחים');
    const num = isAppendix ? '' : `${i + 1}.`;
    const weight = isAppendix ? 'normal' : 'bold';
    const color = isAppendix ? '#4a5568' : '#1a365d';
    html += `<tr><td style="border:none; padding:6px 16px; font-size:14px; font-weight:${weight}; color:${color};">${entry.icon} ${num} <a href="#section-${i}" style="color:${color}; text-decoration:none;">${entry.title}</a></td></tr>\n`;
  });

  html += `</table>\n`;
  html += `<hr style="border:none; border-top:2px solid #e2e8f0; margin:40px 0;">\n`;

  // --- Sections ---
  let count = 0;
  FILE_ORDER.forEach((entry, i) => {
    const fullPath = path.join(SALES_DOCS_DIR, entry.path);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ לא נמצא: ${entry.path}`);
      return;
    }

    const md = fs.readFileSync(fullPath, 'utf-8');
    const sectionHtml = marked.parse(md);

    // Section anchor + divider
    html += `<div id="section-${i}" style="margin-top:40px;">\n`;
    html += sectionHtml;
    html += `</div>\n`;
    html += `<hr style="border:none; border-top:2px solid #e2e8f0; margin:40px 0;">\n`;

    count++;
    const isAppendix = entry.path.includes('נספחים');
    const prefix = isAppendix ? '📎' : `${count}.`;
    console.log(`  ✅ ${prefix} ${entry.title}`);
  });

  // --- Full HTML document ---
  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>Misrad-AI — מסמך מכירה מלא</title>
  <style>
    body {
      font-family: 'Arial', 'David', sans-serif;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
      font-size: 12pt;
      color: #1a1a1a;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 { font-size: 22pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px; margin-top: 30px; }
    h2 { font-size: 16pt; color: #2b6cb0; margin-top: 24px; }
    h3 { font-size: 13pt; color: #2c5282; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; direction: rtl; }
    th, td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: right; }
    th { background-color: #edf2f7; font-weight: bold; }
    tr:nth-child(even) { background-color: #f7fafc; }
    code { background-color: #edf2f7; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10pt; }
    pre { background-color: #2d3748; color: #e2e8f0; padding: 16px; border-radius: 6px; overflow-x: auto; direction: ltr; text-align: left; }
    pre code { background: none; color: inherit; }
    blockquote { border-right: 4px solid #2b6cb0; padding-right: 16px; margin-right: 0; color: #4a5568; background: #f7fafc; padding: 12px 16px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    strong { color: #1a365d; }
    a { color: #2b6cb0; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

  fs.writeFileSync(OUTPUT_HTML, fullHtml, 'utf-8');

  const sizeKB = Math.round(fs.statSync(OUTPUT_HTML).size / 1024);
  console.log(`\n✅ נוצר בהצלחה!`);
  console.log(`📁 ${OUTPUT_HTML}`);
  console.log(`📊 גודל: ${sizeKB} KB`);
  console.log(`📄 ${count} פרקים (כולל נספחים)\n`);
  console.log(`📝 איך לייבא ל-Google Docs:`);
  console.log(`   1. פתח Google Drive`);
  console.log(`   2. New → File Upload → בחר את הקובץ`);
  console.log(`   3. לחץ עליו → Open with Google Docs\n`);
}

main();
