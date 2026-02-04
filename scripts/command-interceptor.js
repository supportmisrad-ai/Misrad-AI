#!/usr/bin/env node
/**
 * Command Interceptor
 * Blocks dangerous commands that could destroy data
 * 
 * הסקריפט הזה מתווסף לחבילת Node.js ומונע הרצה של פקודות מסוכנות
 * שעלולות לגרום לאובדן נתונים
 */

const fs = require('fs');
const path = require('path');

// רשימת הפקודות המסוכנות שאנחנו רוצים לחסום לחלוטין
const DANGEROUS_COMMANDS = [
  'prisma migrate reset',
  'prisma migrate dev',
  'prisma db push',
  'prisma db seed',
  'migrate:reset',
  'db:reset',
  'DROP TABLE',
  'DROP DATABASE',
  'TRUNCATE TABLE'
];

// פקודות שדורשות אישור מיוחד
const WARNING_COMMANDS = [
  'npx prisma migrate',
  'npx prisma db',
  'prisma migrate',
  'prisma db',
  'ALTER TABLE',
  'DELETE FROM',
];

/**
 * פונקציה שמפענחת את הארגומנטים של פקודה
 */
function parseCommandArgs(args) {
  // דלג על node והסקריפט עצמו
  const relevantArgs = args.slice(2);
  return relevantArgs.join(' ').toLowerCase();
}

/**
 * פונקציה שבודקת אם הפקודה מסוכנת
 */
function isDangerousCommand(command) {
  return DANGEROUS_COMMANDS.some(dangerous => 
    command.toLowerCase().includes(dangerous.toLowerCase())
  );
}

/**
 * פונקציה שבודקת אם הפקודה דורשת אזהרה
 */
function isWarningCommand(command) {
  return WARNING_COMMANDS.some(warning => 
    command.toLowerCase().includes(warning.toLowerCase())
  );
}

/**
 * הוסף ל-package.json את הסקריפט כ-preinstall
 */
function installInterceptor() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // הוסף לסקריפטים
    if (!packageJson.scripts) packageJson.scripts = {};
    
    // הוסף את הסקריפטים שיפעילו את הבדיקה לפני הרצת פקודות
    if (!packageJson.scripts['preinstall']) {
      packageJson.scripts['preinstall'] = 'node scripts/command-interceptor.js';
    }
    
    // שמור את השינויים
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Command Interceptor הותקן בהצלחה ויחסום פקודות מסוכנות');
    
  } catch (error) {
    console.error('❌ שגיאה בהתקנת Command Interceptor:', error.message);
  }
  
  // יצירת קובץ npm-pre-script בשורש הפרויקט
  try {
    const hookContent = `#!/usr/bin/env node
// מנגנון חסימת פקודות מסוכנות
require('./scripts/command-interceptor.js');
`;
    
    const hookPath = path.join(__dirname, '..', '.npm-pre-script');
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755'); // הפוך לקובץ הרצה
    
    console.log('✅ .npm-pre-script נוצר בהצלחה');
  } catch (error) {
    console.error('❌ שגיאה ביצירת .npm-pre-script:', error.message);
  }
}

/**
 * יצירת proxy עבור פקודות npm
 */
function createNpmProxy() {
  // יצור קובץ .npmrc בשורש הפרויקט
  const npmrcPath = path.join(__dirname, '..', '.npmrc');
  const npmrcContent = `
onload-script=${path.join(__dirname, 'command-interceptor.js')}
`;

  try {
    fs.writeFileSync(npmrcPath, npmrcContent);
    console.log('✅ נוצר קובץ .npmrc שיפעיל את הבדיקות לפני כל פקודת npm');
  } catch (error) {
    console.error('❌ שגיאה ביצירת קובץ .npmrc:', error.message);
  }
}

/**
 * בדיקת הפקודה הנוכחית
 */
function checkCurrentCommand() {
  const commandLine = process.argv.slice(2).join(' ');
  
  if (isDangerousCommand(commandLine)) {
    console.error('\n❌❌❌ חסום! פקודה מסוכנת זוהתה! ❌❌❌');
    console.error(`הפקודה "${commandLine}" עלולה לגרום לאובדן נתונים!`);
    console.error('פקודה זו נחסמה כחלק ממדיניות האבטחה של המערכת.');
    console.error('אנא השתמש בחלופה הבטוחה שאנו מספקים.');
    console.error('לעזרה, עיין במדריך הבטיחות: מדריך-בטיחות.md\n');
    process.exit(1);
  }
  
  if (isWarningCommand(commandLine)) {
    console.warn('\n⚠️  אזהרה! פקודה פוטנציאלית מסוכנת זוהתה! ⚠️');
    console.warn(`הפקודה "${commandLine}" עלולה לשנות את המבנה או הנתונים בדאטאבייס.`);
    console.warn('וודא שיצרת גיבוי לפני ההרצה: npm run db:backup');
    console.warn('עיין במדריך הבטיחות: מדריך-בטיחות.md\n');
  }
}

/**
 * פונקציה ראשית
 */
function main() {
  const command = process.argv[2];
  
  if (command === 'install') {
    installInterceptor();
    createNpmProxy();
  } else {
    checkCurrentCommand();
  }
}

// אם מריצים ישירות את הסקריפט, בצע התקנה
if (require.main === module) {
  if (process.argv.length <= 2) {
    console.log('🛡️  Command Interceptor - מערכת חסימת פקודות מסוכנות');
    console.log('\nשימוש:');
    console.log('  node scripts/command-interceptor.js install  // להתקנת המערכת');
    console.log('  node scripts/command-interceptor.js check    // לבדיקת הפקודה הנוכחית');
  } else {
    main();
  }
}

module.exports = { isDangerousCommand, checkCurrentCommand };
