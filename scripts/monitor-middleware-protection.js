#!/usr/bin/env node
/**
 * מנטר אוטומטי להגנת middleware.ts
 * בודק שמידlleware.ts קיים ושproxy.ts לא קיים
 */

const fs = require('fs');
const path = require('path');

const MIDDLEWARE_PATH = path.resolve(__dirname, '../middleware.ts');
const PROXY_PATH = path.resolve(__dirname, '../proxy.ts');

console.log('🔍 בודק הגנת middleware.ts...');

// בדיקה 1: middleware.ts חייב להיות קיים
if (fs.existsSync(MIDDLEWARE_PATH)) {
  console.log('✅ middleware.ts קיים (OK)');
} else {
  console.error('❌ אזהרה קריטית! middleware.ts חסר!');
  process.exit(1);
}

// בדיקה 2: proxy.ts אסור שיהיה קיים
if (fs.existsSync(PROXY_PATH)) {
  console.error('❌ אזהרה קריטית! proxy.ts קיים (אסור!)');
  console.error('מחק אותו מיד: rm proxy.ts');
  process.exit(1);
} else {
  console.log('✅ proxy.ts לא קיים (OK)');
}

console.log('\n✅ כל בדיקות ההגנה עברו בהצלחה');
