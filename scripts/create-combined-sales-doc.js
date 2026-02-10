/**
 * יצירת מסמך Word אחד מאוחד מכל מסמכי המכירה
 * כולל תוכן עניינים (תפריט ניווט) ומפרידי עמודים
 * 
 * שימוש:
 *   node scripts/create-combined-sales-doc.js
 * 
 * פלט:
 *   docs/sales-docs/word/Misrad-AI-Sales-Complete.docx
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

const SALES_DOCS_DIR = path.join(__dirname, '..', 'docs', 'sales-docs');
const OUTPUT_FILE = path.join(SALES_DOCS_DIR, 'word', 'Misrad-AI-Sales-Complete.docx');

// סדר הקבצים — ידני, לפי הסדר הנכון
const FILE_ORDER = [
  { path: 'README.md', title: 'תוכן עניינים' },
  { path: '01-סקירה-כללית.md', title: 'סקירה כללית' },
  { path: '02-ארכיטקטורה-טכנית.md', title: 'ארכיטקטורה טכנית' },
  { path: '03-מודל-נתונים.md', title: 'מודל נתונים' },
  { path: '04-מודול-nexus.md', title: 'מודול Nexus — ניהול וצוות' },
  { path: '05-מודול-system.md', title: 'מודול System — מכירות ו-CRM' },
  { path: '06-מודול-social.md', title: 'מודול Social — שיווק ותוכן' },
  { path: '07-מודול-finance.md', title: 'מודול Finance — כספים' },
  { path: '08-מודול-client.md', title: 'מודול Client — לקוחות' },
  { path: '09-מודול-operations.md', title: 'מודול Operations — תפעול' },
  { path: '10-מבנה-תמחור.md', title: 'מבנה תמחור' },
  { path: '11-החבילות.md', title: 'החבילות — פירוט מלא' },
  { path: '12-דוגמאות-מחיר.md', title: 'דוגמאות מחיר' },
  { path: '13-שכבות-אבטחה.md', title: 'שכבות אבטחה' },
  { path: '14-אימות-והרשאות.md', title: 'אימות והרשאות' },
  { path: '15-הגנת-נתונים.md', title: 'הגנת נתונים ופרטיות' },
  { path: '16-יכולות-ai.md', title: 'יכולות AI' },
  { path: '17-אינטגרציות.md', title: 'אינטגרציות' },
  { path: '18-התנגדויות.md', title: 'התנגדויות ותשובות' },
  { path: '19-תהליך-הטמעה.md', title: 'תהליך הטמעה' },
  { path: '20-קהל-יעד.md', title: 'קהל יעד' },
  { path: path.join('נספחים', '21-השוואת-מתחרים.md'), title: 'נספח: השוואת מתחרים' },
  { path: path.join('נספחים', '22-סקריפט-דמו.md'), title: 'נספח: סקריפט דמו' },
  { path: path.join('נספחים', '23-שאלות-נפוצות.md'), title: 'נספח: שאלות נפוצות' },
  { path: path.join('נספחים', '24-roadmap.md'), title: 'נספח: Roadmap' },
  { path: path.join('נספחים', '25-מילון-מונחים.md'), title: 'נספח: מילון מונחים' },
];

function injectRTL(html) {
  const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'td', 'th'];
  let result = html;
  for (const tag of blockTags) {
    result = result.replace(
      new RegExp(`<${tag}((?!dir)[^>]*)>`, 'gi'),
      `<${tag} dir="rtl" align="right"$1>`
    );
  }
  result = result.replace(/<table((?!dir)[^>]*)>/gi, '<table dir="rtl"$1>');
  return result;
}

function buildCoverPage() {
  return `
    <div style="text-align:center; padding-top:200px;">
      <h1 dir="rtl" align="center" style="font-size:36pt; color:#1a365d; text-align:center;">Misrad-AI</h1>
      <h2 dir="rtl" align="center" style="font-size:20pt; color:#2b6cb0; text-align:center;">מסמך מכירה מלא</h2>
      <p dir="rtl" align="center" style="font-size:14pt; color:#718096; text-align:center;">פלטפורמת ניהול עסקי All-in-One</p>
      <p dir="rtl" align="center" style="font-size:12pt; color:#a0aec0; text-align:center;">גרסה 3.0 — פברואר 2026</p>
    </div>
    <br clear="all" style="page-break-before:always" />
  `;
}

function buildTOC(entries) {
  let toc = `
    <h1 dir="rtl" align="right" style="color:#1a365d; border-bottom:2px solid #2b6cb0; padding-bottom:8px;">📋 תוכן עניינים</h1>
    <table dir="rtl" style="width:100%; border:none;">
  `;
  
  let sectionNum = 0;
  for (const entry of entries) {
    // Skip README since we build our own TOC
    if (entry.path === 'README.md') continue;
    sectionNum++;
    
    const isAppendix = entry.path.includes('נספחים');
    const prefix = isAppendix ? '📎' : `${sectionNum}.`;
    const style = isAppendix
      ? 'color:#4a5568; font-size:11pt;'
      : 'color:#1a365d; font-size:12pt; font-weight:bold;';
    
    toc += `
      <tr>
        <td dir="rtl" align="right" style="border:none; padding:6px 12px; ${style}">${prefix} ${entry.title}</td>
      </tr>
    `;
  }
  
  toc += '</table>';
  toc += '<br clear="all" style="page-break-before:always" />';
  return toc;
}

async function main() {
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n📄 מייצר מסמך Word מאוחד...\n');

  // Build cover page
  let combinedHtml = buildCoverPage();
  
  // Build TOC
  combinedHtml += buildTOC(FILE_ORDER);
  
  // Build content sections
  let sectionNum = 0;
  for (const entry of FILE_ORDER) {
    // Skip README — we already built a custom TOC
    if (entry.path === 'README.md') continue;
    
    sectionNum++;
    const fullPath = path.join(SALES_DOCS_DIR, entry.path);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ לא נמצא: ${entry.path}`);
      continue;
    }
    
    const md = fs.readFileSync(fullPath, 'utf-8');
    let html = marked.parse(md);
    html = injectRTL(html);
    
    // Wrap section with a section header and page break
    combinedHtml += `
      <div>
        ${html}
      </div>
      <br clear="all" style="page-break-before:always" />
    `;
    
    console.log(`  ✅ ${sectionNum}. ${entry.title}`);
  }

  // Full HTML document
  const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="utf-8">
      <title>Misrad-AI — מסמך מכירה מלא</title>
      <style>
        body {
          font-family: 'David', 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          line-height: 1.8;
          font-size: 11pt;
          color: #1a1a1a;
        }
        h1 { font-size: 20pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 6px; margin-top: 12px; }
        h2 { font-size: 15pt; color: #2b6cb0; margin-top: 18px; }
        h3 { font-size: 12pt; color: #2c5282; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        th, td { border: 1px solid #cbd5e0; padding: 6px 10px; text-align: right; font-size: 10pt; }
        th { background-color: #edf2f7; font-weight: bold; }
        tr:nth-child(even) { background-color: #f7fafc; }
        code { background-color: #edf2f7; padding: 1px 4px; font-family: 'Courier New', monospace; font-size: 9pt; }
        pre { background-color: #2d3748; color: #e2e8f0; padding: 12px; overflow-x: auto; direction: ltr; text-align: left; font-size: 9pt; }
        pre code { background: none; color: inherit; }
        blockquote { border-right: 3px solid #2b6cb0; padding-right: 12px; margin-right: 0; color: #4a5568; background: #f7fafc; padding: 8px 12px; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        strong { color: #1a365d; }
      </style>
    </head>
    <body dir="rtl">
      ${combinedHtml}
    </body>
    </html>
  `;

  // Convert to DOCX
  console.log('\n  ⏳ ממיר ל-DOCX...');
  
  const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    title: 'Misrad-AI — מסמך מכירה מלא',
    lang: 'he-IL',
  });

  fs.writeFileSync(OUTPUT_FILE, docxBuffer);
  
  const sizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`\n✅ נוצר בהצלחה!`);
  console.log(`📁 ${OUTPUT_FILE}`);
  console.log(`📊 גודל: ${sizeKB} KB`);
  console.log(`📄 ${sectionNum} פרקים\n`);
}

main().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
