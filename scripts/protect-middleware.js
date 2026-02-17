#!/usr/bin/env node
/**
 * 🛡️ הגנה על middleware.ts - מונע מחיקה ויצירת proxy.ts
 * 
 * middleware.ts הוא הלב של המערכת:
 * - Clerk Authentication
 * - Rate Limiting גלובלי
 * - Maintenance Mode
 * - Legacy Routing
 * - E2E Testing Blocks
 * 
 * ⚠️ אזהרה: ביצענו מיזוג מלא של proxy.ts -> middleware.ts
 * אסור ליצור proxy.ts בשום מקרה! זה יגרום לקונפליקט ויחזיר אותנו אחורה.
 */

const fs = require('fs');
const path = require('path');

// נתיבים קריטיים
const MIDDLEWARE_PATH = path.resolve(__dirname, '../middleware.ts');
const PROXY_PATH = path.resolve(__dirname, '../proxy.ts');
const BACKUP_DIR = path.resolve(__dirname, '../backups/protected-core');

/**
 * יצירת גיבוי למקרה חירום
 */
function backupMiddleware() {
  try {
    if (!fs.existsSync(MIDDLEWARE_PATH)) {
      console.error('❌ middleware.ts לא קיים! זה קריטי!');
      return false;
    }

    // ודא שתיקיית הגיבוי קיימת
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `middleware.ts.${timestamp}.backup`);
    
    fs.copyFileSync(MIDDLEWARE_PATH, backupPath);
    console.log(`✅ נוצר גיבוי: ${path.basename(backupPath)}`);
    
    return true;
  } catch (error) {
    console.error(`❌ שגיאה ביצירת גיבוי: ${error.message}`);
    return false;
  }
}

/**
 * בדיקה אם proxy.ts קיים (אסור!)
 */
function checkForProxyFile() {
  if (fs.existsSync(PROXY_PATH)) {
    console.error('\n❌❌❌ אזהרה קריטית! ❌❌❌');
    console.error('נמצא קובץ proxy.ts בשורש הפרויקט!');
    console.error('זה גורם לקונפליקט עם middleware.ts ומשבש את המערכת.');
    console.error('\nביצענו מיזוג מלא: proxy.ts -> middleware.ts');
    console.error('proxy.ts צריך להימחק מיד!\n');
    return true;
  }
  return false;
}

/**
 * יצירת .gitignore entry למניעת proxy.ts
 */
function preventProxyCreation() {
  try {
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    let gitignoreContent = '';
    
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    // בדוק אם כבר קיימת הכללה
    if (!gitignoreContent.includes('# DO NOT CREATE proxy.ts')) {
      const preventionRule = `
# DO NOT CREATE proxy.ts - We merged it into middleware.ts
# Creating proxy.ts will cause conflicts and break the system
/proxy.ts
`;
      fs.appendFileSync(gitignorePath, preventionRule);
      console.log('✅ נוספה הגנה ב-.gitignore נגד proxy.ts');
    }
    
    return true;
  } catch (error) {
    console.error(`⚠️  שגיאה בעדכון .gitignore: ${error.message}`);
    return false;
  }
}

/**
 * יצירת סקריפט ניטור אוטומטי
 */
function createMonitorScript() {
  try {
    const monitorPath = path.resolve(__dirname, 'monitor-middleware-protection.js');
    
    const scriptContent = `#!/usr/bin/env node
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

console.log('\\n✅ כל בדיקות ההגנה עברו בהצלחה');
`;

    fs.writeFileSync(monitorPath, scriptContent);
    fs.chmodSync(monitorPath, 0o755);
    
    return monitorPath;
  } catch (error) {
    console.error(`❌ שגיאה ביצירת סקריפט ניטור: ${error.message}`);
    return null;
  }
}

/**
 * עדכון package.json עם פקודות הגנה
 */
function updatePackageJson() {
  try {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    let updated = false;
    
    // הוסף פקודת הגנה
    if (!packageJson.scripts['protect:middleware']) {
      packageJson.scripts['protect:middleware'] = 'node scripts/protect-middleware.js';
      updated = true;
    }
    
    // הוסף פקודת ניטור
    if (!packageJson.scripts['check:middleware']) {
      packageJson.scripts['check:middleware'] = 'node scripts/monitor-middleware-protection.js';
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('✅ נוספו פקודות הגנה ל-package.json');
    }
    
    return true;
  } catch (error) {
    console.error(`⚠️  שגיאה בעדכון package.json: ${error.message}`);
    return false;
  }
}

/**
 * יצירת מדריך הגנה
 */
function createProtectionGuide() {
  try {
    const guidePath = path.resolve(__dirname, '../docs/MIDDLEWARE-PROTECTION.md');
    const docsDir = path.dirname(guidePath);
    
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    const content = `# 🛡️ הגנת middleware.ts - חוקי ברזל

## 📌 כללי יסוד

### ✅ מותר:
- לערוך את \`middleware.ts\` (בזהירות!)
- להוסיף routes חדשים ל-\`isPublicRoute\`
- לעדכן לוגיקה של maintenance mode
- להוסיף rate limiting rules

### ❌ אסור בהחלט:
- **למחוק את \`middleware.ts\`** - זה הלב של המערכת!
- **ליצור \`proxy.ts\`** - ביצענו מיזוג מלא, יצירתו תשבור הכל!
- **לשנות את export const config** - זה קריטי ל-Next.js
- **למחוק את Clerk middleware** - אבטחה!

---

## 🔧 תחזוקה שוטפת

### בדיקת תקינות:
\`\`\`bash
npm run check:middleware
\`\`\`

### הרצת הגנה מחדש:
\`\`\`bash
npm run protect:middleware
\`\`\`

### בדיקת גיבויים:
\`\`\`bash
ls -la backups/protected-core/
\`\`\`

---

## 🚨 מה לעשות אם proxy.ts נוצר בטעות?

**מחק אותו מיד:**
\`\`\`bash
rm proxy.ts
# או
Remove-Item proxy.ts -Force
\`\`\`

**לאחר מחיקה, וודא שהמערכת תקינה:**
\`\`\`bash
npm run check:middleware
npm run dev
\`\`\`

---

## 📜 היסטוריה

**פברואר 2026**: ביצענו מיזוג מלא של \`proxy.ts\` -> \`middleware.ts\`.  
הסיבה: Next.js 16 migration + conflict resolution.

**לפני המיזוג**: היו שני קבצים שגרמו לקונפליקטים.  
**אחרי המיזוג**: רק \`middleware.ts\` אחד ויחיד עם כל הלוגיקה.

---

## 🔒 הגנות פעילות

1. ✅ .gitignore מונע commit של proxy.ts
2. ✅ סקריפט ניטור אוטומטי
3. ✅ גיבויים אוטומטיים של middleware.ts
4. ✅ פקודות npm להגנה ובדיקה

---

**זכור**: middleware.ts = הלב של המערכת. טפל בו כאילו זה קוד קריטי לביטחון לאומי! 🇮🇱
`;

    fs.writeFileSync(guidePath, content);
    console.log(`✅ נוצר מדריך הגנה: ${path.relative(process.cwd(), guidePath)}`);
    
    return guidePath;
  } catch (error) {
    console.error(`⚠️  שגיאה ביצירת מדריך: ${error.message}`);
    return null;
  }
}

/**
 * עדכון קובץ monitor-protected-files.js להוסיף middleware.ts
 */
function updateExistingMonitor() {
  try {
    const monitorPath = path.resolve(__dirname, 'monitor-protected-files.js');
    
    if (!fs.existsSync(monitorPath)) {
      return false; // לא קיים, נדלג
    }

    let content = fs.readFileSync(monitorPath, 'utf8');
    
    // בדוק אם כבר מוגן
    if (content.includes('middleware.ts')) {
      console.log('✅ middleware.ts כבר מוגן ב-monitor-protected-files.js');
      return true;
    }

    // הוסף את middleware.ts לרשימת הקבצים המוגנים
    const updatedContent = content.replace(
      /const PROTECTED_FILES = \[([^\]]+)\]/,
      `const PROTECTED_FILES = [$1,\n  path.resolve(__dirname, '../middleware.ts') // Core routing & auth`
    );

    if (updatedContent !== content) {
      fs.writeFileSync(monitorPath, updatedContent);
      console.log('✅ middleware.ts נוסף ל-monitor-protected-files.js');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`⚠️  שגיאה בעדכון monitor: ${error.message}`);
    return false;
  }
}

/**
 * פונקציה ראשית
 */
async function main() {
  console.log('🛡️  מתחיל הגנה על middleware.ts ומניעת proxy.ts...\n');
  
  try {
    // בדיקה 1: middleware.ts חייב להיות קיים
    if (!fs.existsSync(MIDDLEWARE_PATH)) {
      console.error('❌ middleware.ts לא קיים! זה קריטי!');
      console.error('המערכת לא יכולה לעבוד בלי middleware.ts\n');
      process.exit(1);
    }
    console.log('✅ middleware.ts קיים');

    // בדיקה 2: proxy.ts אסור שיהיה קיים
    if (checkForProxyFile()) {
      console.error('\nאנא מחק את proxy.ts מיד ולאחר מכן הרץ סקריפט זה שוב.\n');
      process.exit(1);
    }
    console.log('✅ proxy.ts לא קיים (כמו שצריך)\n');

    // שלב 1: גיבוי
    console.log('📦 שלב 1: יצירת גיבוי...');
    if (!backupMiddleware()) {
      throw new Error('נכשל ביצירת גיבוי');
    }

    // שלב 2: מניעת proxy.ts ב-.gitignore
    console.log('\n🚫 שלב 2: הוספת הגנה נגד proxy.ts...');
    preventProxyCreation();

    // שלב 3: יצירת סקריפט ניטור
    console.log('\n👁️  שלב 3: יצירת סקריפט ניטור...');
    const monitorPath = createMonitorScript();
    if (monitorPath) {
      console.log(`✅ נוצר: ${path.basename(monitorPath)}`);
    }

    // שלב 4: עדכון package.json
    console.log('\n📝 שלב 4: עדכון package.json...');
    updatePackageJson();

    // שלב 5: עדכון monitor קיים
    console.log('\n🔄 שלב 5: עדכון מנטר קיים...');
    updateExistingMonitor();

    // שלב 6: יצירת מדריך
    console.log('\n📚 שלב 6: יצירת מדריך הגנה...');
    createProtectionGuide();

    // סיכום
    console.log('\n' + '='.repeat(70));
    console.log('✅ הגנת middleware.ts הותקנה בהצלחה!');
    console.log('='.repeat(70));
    console.log('\n📌 חוקי ברזל:');
    console.log('   1. ✅ middleware.ts = קובץ קריטי - אל תמחק!');
    console.log('   2. ❌ proxy.ts = אסור ליצור - גורם לקונפליקט!');
    console.log('   3. 🔄 ביצענו מיזוג מלא: proxy.ts -> middleware.ts');
    console.log('\n🛠️  פקודות שימושיות:');
    console.log('   • npm run check:middleware     - בדיקת תקינות');
    console.log('   • npm run protect:middleware   - הגנה מחדש');
    console.log('   • npm run db:check:protection  - בדיקה כוללת\n');

  } catch (error) {
    console.error(`\n❌ שגיאה קריטית: ${error.message}\n`);
    process.exit(1);
  }
}

main();
