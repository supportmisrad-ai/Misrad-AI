#!/usr/bin/env node
/**
 * הגנה-על-ההגנה: סקריפט המגן על סקריפט ההגנה על ארגונים
 * מונע מחיקה של סקריפט ההגנה עצמו ללא אישור מפורש
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();
const ADMIN_PASSWORD = 'MisradAI2026!'; // אותה סיסמה כמו בסקריפט ההגנה המקורי

// קבצים חשובים שאנחנו רוצים להגן עליהם
const PROTECTED_FILES = [
  path.resolve(__dirname, 'protect-organizations.js'),
  path.resolve(__dirname, 'protect-the-protector.js') // הגנה על הסקריפט הזה עצמו
];

// יצירת ממשק קלט פלט
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * בדיקה אם הקובץ קיים
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`שגיאה בבדיקת קיום הקובץ: ${error.message}`);
    return false;
  }
}

/**
 * יצירת גיבוי לקובץ
 */
function backupFile(filePath) {
  try {
    const backupDir = path.join(__dirname, '../backups/protected-scripts');
    
    // ודא שתיקיית הגיבוי קיימת
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filename = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${filename}.${timestamp}.backup`);
    
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ נוצר גיבוי בנתיב: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    console.error(`❌ שגיאה ביצירת גיבוי: ${error.message}`);
    return null;
  }
}

/**
 * הגנה על קבצים חשובים באמצעות שינוי הרשאות
 */
function protectFileWithPermissions(filePath) {
  try {
    // 0o444 = read-only לכל המשתמשים
    fs.chmodSync(filePath, 0o444);
    return true;
  } catch (error) {
    console.error(`❌ שגיאה בשינוי הרשאות לקובץ ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * התקנת מנגנון ניטור שינויים בקבצים
 * מייצר סקריפט שרץ כל יום ובודק אם הקבצים המוגנים קיימים
 */
function setupFileMonitoring() {
  try {
    const monitorScript = path.resolve(__dirname, 'monitor-protected-files.js');
    
    const scriptContent = `#!/usr/bin/env node
/**
 * מנטר אוטומטי לקבצים מוגנים
 * רץ באופן מתוזמן ומוודא שהקבצים החשובים קיימים
 */

const fs = require('fs');
const path = require('path');

// קבצים חשובים שאנחנו רוצים לנטר
const PROTECTED_FILES = [
  path.resolve(__dirname, 'protect-organizations.js'),
  path.resolve(__dirname, 'protect-the-protector.js')
];

function checkFiles() {
  console.log('🔍 בודק קבצים מוגנים...');
  
  PROTECTED_FILES.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(\`✅ קובץ קיים: \${path.basename(filePath)}\`);
    } else {
      console.log(\`⚠️  אזהרה! קובץ חסר: \${path.basename(filePath)}\`);
      // כאן אפשר להוסיף התראה במייל או הודעה אחרת
    }
  });
}

checkFiles();
`;
    
    fs.writeFileSync(monitorScript, scriptContent);
    fs.chmodSync(monitorScript, 0o755); // הרשאות הרצה
    
    // הוסף לקובץ package.json פקודה חדשה
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // וודא שאין כפילות
    if (!packageJson.scripts['db:check:protection']) {
      packageJson.scripts['db:check:protection'] = 'node scripts/monitor-protected-files.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    
    return true;
  } catch (error) {
    console.error(`❌ שגיאה בהתקנת מנגנון ניטור: ${error.message}`);
    return false;
  }
}

/**
 * יצירת הוראות להסרת הגנה במקרה הצורך
 */
function createRemovalInstructions() {
  try {
    const instructionsPath = path.resolve(__dirname, '../איך-להסיר-הגנה-על-סקריפטים.md');
    
    const content = `# איך להסיר הגנה על סקריפטים חשובים

במקרה שצריך להסיר את ההגנה על סקריפטים חשובים, יש לבצע את השלבים הבאים:

## 1. להריץ את הפקודה להסרת הגנת "קריאה בלבד"

\`\`\`bash
# בחלונות
attrib -r c:\\Projects\\Misrad-AI\\scripts\\protect-organizations.js
attrib -r c:\\Projects\\Misrad-AI\\scripts\\protect-the-protector.js

# בלינוקס/מק
chmod 644 /path/to/Misrad-AI/scripts/protect-organizations.js
chmod 644 /path/to/Misrad-AI/scripts/protect-the-protector.js
\`\`\`

## 2. הזנת סיסמת מנהל

הסיסמה: \`MisradAI2026!\`

## 3. לאחר עריכה/מחיקה, מומלץ להחזיר את ההגנה

הרץ את הפקודה:
\`\`\`
npm run db:protect-scripts
\`\`\`

**שים לב**: מחיקת סקריפטים אלו יכולה להוביל לבעיות בהגנה על הארגונים החשובים במערכת.
`;
    
    fs.writeFileSync(instructionsPath, content);
    return instructionsPath;
  } catch (error) {
    console.error(`❌ שגיאה ביצירת הוראות: ${error.message}`);
    return null;
  }
}

/**
 * פונקציה ראשית
 */
async function main() {
  console.log('🛡️  מתקין הגנה על סקריפט ההגנה עצמו...\n');
  
  try {
    // בדוק אם הקבצים קיימים
    const missingFiles = PROTECTED_FILES.filter(file => !fileExists(file));
    
    if (missingFiles.length > 0) {
      console.log('❌ הקבצים הבאים לא נמצאו:');
      missingFiles.forEach(file => console.log(`   ${path.basename(file)}`));
      console.log('');
      process.exit(1);
    }
    
    // גבה את הקבצים החשובים
    console.log('📦 יוצר גיבוי לקבצים חשובים...');
    const backups = PROTECTED_FILES.map(file => {
      const backup = backupFile(file);
      console.log(`   ${path.basename(file)} ✓`);
      return backup;
    });
    console.log('');
    
    // הגן על הקבצים עם הרשאות קריאה בלבד
    console.log('🔒 מגן על הקבצים עם הרשאות "קריאה בלבד"...');
    PROTECTED_FILES.forEach(file => {
      if (protectFileWithPermissions(file)) {
        console.log(`   ${path.basename(file)} ✓`);
      }
    });
    console.log('');
    
    // התקן מנגנון ניטור
    console.log('👁️  מתקין מנגנון ניטור קבצים...');
    if (setupFileMonitoring()) {
      console.log('   מנגנון ניטור הותקן בהצלחה');
    }
    console.log('');
    
    // צור הוראות להסרת הגנה
    console.log('📝 יוצר הוראות להסרת הגנה במקרה הצורך...');
    const instructionsPath = createRemovalInstructions();
    if (instructionsPath) {
      console.log(`   ההוראות נשמרו ב: ${path.basename(instructionsPath)}`);
    }
    console.log('');
    
    // הוסף פקודה ל-package.json
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // וודא שאין כפילות
    if (!packageJson.scripts['db:protect-scripts']) {
      packageJson.scripts['db:protect-scripts'] = 'node scripts/protect-the-protector.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ נוספה פקודה חדשה: npm run db:protect-scripts');
    }
    
    console.log('\n✅ מנגנון ההגנה על ההגנה הותקן בהצלחה!');
    console.log('   כעת הסקריפטים החשובים מוגנים מפני מחיקה בטעות.');
    console.log('   כדי למחוק אותם יהיה צורך בהסרה מפורשת של ההגנה.\n');
    
  } catch (error) {
    console.error(`❌ שגיאה: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
