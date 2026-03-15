#!/usr/bin/env node
/**
 * DB URL Inspector - בודק את פורמט ה-DATABASE_URL
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filepath) {
  const fullPath = path.join(process.cwd(), filepath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ קובץ לא נמצא: ${filepath}`);
    return null;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  // תמיכה בשני סוגי סיומות שורות: Windows (\r\n) ו-Unix (\n)
  const lines = content.split(/\r?\n/);
  const env = {};
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  }
  
  return env;
}

function checkUrl(url, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`בודק: ${name}`);
  console.log('='.repeat(60));
  
  if (!url) {
    console.log('❌ לא נמצא');
    return;
  }
  
  // Mask password for display
  const masked = url.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
  console.log(`URL: ${masked}`);
  
  // Parse URL
  try {
    const urlObj = new URL(url);
    
    console.log(`\nפרוטוקול: ${urlObj.protocol}`);
    console.log(`הוסט: ${urlObj.hostname}`);
    console.log(`פורט: ${urlObj.port || '(default)'}`);
    console.log(`מסד נתונים: ${urlObj.pathname.replace('/', '')}`);
    
    // Check for issues
    const issues = [];
    
    if (urlObj.protocol !== 'postgresql:' && urlObj.protocol !== 'postgres:') {
      issues.push('❌ פרוטוקול לא חוקי (צריך להיות postgresql:// או postgres://)');
    }
    
    if (!urlObj.hostname) {
      issues.push('❌ חסר הוסט');
    }
    
    if (!urlObj.pathname || urlObj.pathname === '/') {
      issues.push('❌ חסר שם מסד נתונים');
    }
    
    // Check for special characters that need escaping
    const userInfo = urlObj.username || '';
    const password = urlObj.password || '';
    
    if (password && /[#?&@\/]/.test(password)) {
      issues.push('⚠️ הסיסמא מכילה תווים מיוחדים שצריכים escaping');
    }
    
    if (issues.length > 0) {
      console.log('\nבעיות שנמצאו:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ ה-URL תקין');
    }
    
    // Check for pooler port
    if (urlObj.port === '6543') {
      console.log('\n⚠️ נמצא פורט 6543 (Supabase Pooler)');
      console.log('   ייתכן שתצטרך DIRECT_URL עם פורט 5432');
    }
    
  } catch (e) {
    console.log(`\n❌ שגיאה בפרסור URL: ${e.message}`);
  }
}

// Main
console.log('בודק משתני סביבה...\n');

const prodEnv = loadEnvFile('.env.prod_backup');
const localEnv = loadEnvFile('.env.local');

if (prodEnv) {
  checkUrl(prodEnv.DATABASE_URL, '.env.prod_backup - DATABASE_URL');
  checkUrl(prodEnv.DIRECT_URL, '.env.prod_backup - DIRECT_URL');
}

if (localEnv) {
  checkUrl(localEnv.DATABASE_URL, '.env.local - DATABASE_URL');
  checkUrl(localEnv.DIRECT_URL, '.env.local - DIRECT_URL');
}

console.log('\n');
