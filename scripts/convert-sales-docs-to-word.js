/**
 * המרת מסמכי מכירה (Markdown) לקבצי Word (DOCX)
 * 
 * שימוש:
 *   node scripts/convert-sales-docs-to-word.js
 * 
 * פלט:
 *   docs/sales-docs/word/ — כל הקבצים בפורמט .docx
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

const SALES_DOCS_DIR = path.join(__dirname, '..', 'docs', 'sales-docs');
const OUTPUT_DIR = path.join(SALES_DOCS_DIR, 'word');

const HTML_WRAPPER = (title, body) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'David', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
      font-size: 12pt;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 22pt; color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px; }
    h2 { font-size: 16pt; color: #2b6cb0; margin-top: 24px; }
    h3 { font-size: 13pt; color: #2c5282; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: right; }
    th { background-color: #edf2f7; font-weight: bold; }
    tr:nth-child(even) { background-color: #f7fafc; }
    code { background-color: #edf2f7; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10pt; }
    pre { background-color: #1a202c; color: #e2e8f0; padding: 16px; border-radius: 6px; overflow-x: auto; direction: ltr; text-align: left; }
    pre code { background: none; color: inherit; }
    blockquote { border-right: 4px solid #2b6cb0; padding-right: 16px; margin-right: 0; color: #4a5568; background: #f7fafc; padding: 12px 16px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    strong { color: #1a365d; }
    a { color: #2b6cb0; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;

function getAllMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && item !== 'word') {
      getAllMarkdownFiles(fullPath, files);
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function injectRTL(html) {
  // html-to-docx needs dir="rtl" on each block element, CSS alone won't work
  const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'td', 'th'];
  let result = html;
  for (const tag of blockTags) {
    // Add dir="rtl" and align="right" to opening tags (that don't already have dir)
    result = result.replace(
      new RegExp(`<${tag}((?!dir)[^>]*)>`, 'gi'),
      `<${tag} dir="rtl" align="right"$1>`
    );
  }
  // Tables should be RTL too
  result = result.replace(/<table((?!dir)[^>]*)>/gi, '<table dir="rtl"$1>');
  return result;
}

async function convertFile(mdPath) {
  const md = fs.readFileSync(mdPath, 'utf-8');
  const fileName = path.basename(mdPath, '.md');
  
  let html = marked.parse(md);
  html = injectRTL(html);
  const fullHtml = HTML_WRAPPER(fileName, html);
  const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });
  
  return { fileName, docxBuffer };
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const mdFiles = getAllMarkdownFiles(SALES_DOCS_DIR);
  console.log(`\n📄 נמצאו ${mdFiles.length} קבצי Markdown\n`);

  let success = 0;
  let errors = 0;

  for (const mdPath of mdFiles) {
    const relativePath = path.relative(SALES_DOCS_DIR, mdPath);
    try {
      const { fileName, docxBuffer } = await convertFile(mdPath);
      
      const outputPath = path.join(OUTPUT_DIR, `${fileName}.docx`);
      fs.writeFileSync(outputPath, docxBuffer);
      
      console.log(`  ✅ ${relativePath} → word/${fileName}.docx`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${relativePath}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 סיכום: ${success} הצליחו, ${errors} נכשלו`);
  console.log(`📁 קבצי Word נשמרו ב: ${OUTPUT_DIR}\n`);
}

main();
