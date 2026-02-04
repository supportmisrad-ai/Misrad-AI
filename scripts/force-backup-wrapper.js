#!/usr/bin/env node
/**
 * Forced Backup Wrapper
 * Forces a backup before running database-modifying commands
 */

require('dotenv').config({ path: '.env' });
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const { execSync, spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const { createNamedBackup } = require('./named-backup');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// פקודות שמשנות את הדאטאבייס ודורשות גיבוי מראש
const DB_MODIFYING_COMMANDS = [
  'prisma migrate',
  'prisma db',
  'db:migrate',
  'migrate:safe',
  'sql:safe',
  'db:push',
  'db:seed',
  'db:create',
  'db:run',
];

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ לא צוינה פקודה להרצה');
    console.log('שימוש: node force-backup-wrapper.js <פקודה-להרצה>');
    process.exit(1);
  }
  
  const command = args.join(' ');
  console.log(`🔍 בודק פקודה: ${command}`);
  
  // בדוק אם הפקודה משנה את הדאטאבייס
  const modifiesDB = DB_MODIFYING_COMMANDS.some(cmd => command.toLowerCase().includes(cmd.toLowerCase()));
  
  if (modifiesDB) {
    console.log('\n⚠️ זוהתה פקודה שמשנה את הדאטאבייס!');
    console.log('📋 נדרש לבצע גיבוי לפני המשך הפעולה.\n');
    
    const backupNow = await new Promise(resolve => {
      rl.question('האם לבצע גיבוי עכשיו? (כן/לא): ', answer => {
        resolve(answer.toLowerCase() === 'כן');
      });
    });
    
    if (!backupNow) {
      console.log('\n❌ הפעולה בוטלה - לא נוצר גיבוי.');
      rl.close();
      process.exit(0);
    }
    
    // בקש שם לגיבוי
    const operationName = command.split(' ')[0].replace(/[^\p{L}\p{N}]/gu, '');
    const defaultBackupName = `לפני-${operationName}-${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}`;
    
    const backupName = await new Promise(resolve => {
      rl.question(`שם הגיבוי (ברירת מחדל: "${defaultBackupName}"): `, answer => {
        resolve(answer || defaultBackupName);
      });
    });
    
    // יצירת הגיבוי
    console.log('\n🔄 יוצר גיבוי...');
    try {
      const backupPath = await createNamedBackup(backupName);
      console.log(`✅ הגיבוי נוצר בהצלחה: ${path.basename(backupPath)}\n`);
    } catch (error) {
      console.error(`❌ שגיאה ביצירת גיבוי: ${error.message}`);
      console.log('⚠️ ממשיך ללא גיבוי - על אחריותך!\n');
    }
  } else {
    console.log('✅ פקודה זו אינה משנה את הדאטאבייס, אין צורך בגיבוי.\n');
  }
  
  rl.close();
  
  // הרץ את הפקודה המקורית
  console.log(`🚀 מריץ פקודה: ${command}\n`);
  
  try {
    // שימוש ב-spawn כדי לאפשר אינטראקציה עם הפקודה
    const [cmd, ...cmdArgs] = command.split(' ');
    
    const childProcess = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      shell: true
    });
    
    childProcess.on('error', (error) => {
      console.error(`❌ שגיאה בהרצת הפקודה: ${error.message}`);
      process.exit(1);
    });
    
    childProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`\n❌ הפקודה נכשלה עם קוד יציאה ${code}`);
      } else {
        console.log('\n✅ הפקודה הסתיימה בהצלחה');
      }
      process.exit(code);
    });
    
  } catch (error) {
    console.error(`❌ שגיאה בהרצת הפקודה: ${error.message}`);
    process.exit(1);
  }
}

main();
