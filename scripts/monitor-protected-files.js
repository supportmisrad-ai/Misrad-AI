#!/usr/bin/env node
/**
 * מנטר אוטומטי לקבצים מוגנים
 * רץ באופן מתוזמן ומוודא שהקבצים החשובים קיימים
 */

const fs = require('fs');
const path = require('path');

// קבצים חשובים שאנחנו רוצים לנטר
const PROTECTED_FILES = [
  path.resolve(__dirname, 'protect-organizations.js'),
  path.resolve(__dirname, 'protect-the-protector.js'),
  path.resolve(__dirname, '../middleware.ts'), // Core routing & auth
];

function checkFiles() {
  console.log('🔍 בודק קבצים מוגנים...');
  
  PROTECTED_FILES.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`✅ קובץ קיים: ${path.basename(filePath)}`);
    } else {
      console.log(`⚠️  אזהרה! קובץ חסר: ${path.basename(filePath)}`);
      // כאן אפשר להוסיף התראה במייל או הודעה אחרת
    }
  });
}

checkFiles();
