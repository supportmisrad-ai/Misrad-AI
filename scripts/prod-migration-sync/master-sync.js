#!/usr/bin/env node
/**
 * master-sync.js
 * סקריפט מאסטר שמריץ את כל תהליך הסנכרון אוטומטית
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/master-sync.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const readline = require('readline');

const execAsync = promisify(exec);

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function runScript(scriptName, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 ${description}`);
  console.log(`${'='.repeat(60)}\n`);

  const scriptPath = path.join(__dirname, scriptName);
  try {
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      env: { ...process.env }
    });
    console.log(stdout);
    if (stderr) console.log('⚠️ ', stderr);
    return true;
  } catch (error) {
    console.error(`❌ שגיאה ב-${scriptName}:`, error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return false;
  }
}

async function masterSync() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Production Migration Sync - Master Script            ║
║                                                            ║
║   מסנכרן את Production למצב DEV הנקי                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

  console.log('📋 תהליך הסנכרון כולל:');
  console.log('   1️⃣  גיבוי מלא של Production');
  console.log('   2️⃣  בדיקת מצב נוכחי');
  console.log('   3️⃣  ניקוי טבלת מיגרציות (עם אישור)');
  console.log('   4️⃣  Baseline למיגרציות קיימות');
  console.log('   5️⃣  Deploy מיגרציות חדשות');
  console.log('   6️⃣  אימות סופי');
  console.log('');

  const confirmed = await askConfirmation(
    '❓ האם להתחיל את תהליך הסנכרון? (yes/no): '
  );

  if (!confirmed) {
    console.log('\n❌ התהליך בוטל על ידי המשתמש\n');
    process.exit(0);
  }

  try {
    // שלב 1: גיבוי
    const backupSuccess = await runScript('01-backup-production.js', 'שלב 1/6: גיבוי Production');
    if (!backupSuccess) {
      console.log('\n❌ הגיבוי נכשל - עוצר את התהליך');
      process.exit(1);
    }

    // שלב 2: בדיקת מצב
    await runScript('02-check-migrations-status.js', 'שלב 2/6: בדיקת מצב נוכחי');

    // שלב 3: ניקוי (אופציונלי)
    console.log('\n' + '='.repeat(60));
    console.log('🗑️  שלב 3/6: ניקוי טבלת מיגרציות (אופציונלי)');
    console.log('='.repeat(60) + '\n');
    
    const cleanConfirmed = await askConfirmation(
      '❓ האם לנקות את טבלת _prisma_migrations? (yes/no): '
    );

    if (cleanConfirmed) {
      await runScript('03-clean-migrations-table.js', 'מנקה טבלת מיגרציות...');
    } else {
      console.log('⏭️  מדלג על ניקוי\n');
    }

    // שלב 4: Baseline
    const baselineSuccess = await runScript('04-baseline-migrations.js', 'שלב 4/6: Baseline מיגרציות');
    if (!baselineSuccess) {
      console.log('\n⚠️  Baseline נכשל - אך אפשר להמשיך');
    }

    // שלב 5: Deploy
    const deploySuccess = await runScript('05-deploy-migrations.js', 'שלב 5/6: Deploy מיגרציות');
    if (!deploySuccess) {
      console.log('\n❌ Deploy נכשל - בדוק את הלוגים');
      process.exit(1);
    }

    // שלב 6: אימות
    const verifySuccess = await runScript('06-verify-sync.js', 'שלב 6/6: אימות סופי');
    
    if (verifySuccess) {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉 הצלחה! Production מסונכרן לחלוטין עם DEV            ║
║                                                            ║
║   ✅ כל 35 המיגרציות מיושמות                              ║
║   ✅ כל הטבלאות קיימות                                    ║
║   ✅ עמודות חדשות (שבת, SaaS) זמינות                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
      process.exit(0);
    } else {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ⚠️  הסנכרון הושלם אך יש בעיות באימות                   ║
║                                                            ║
║   💡 המלצה: בדוק את הלוגים והרץ סקריפט 06 שוב            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ שגיאה קריטית:', error.message);
    console.log('\n💡 ניתן לשחזר מגיבוי באמצעות סקריפט 07-rollback.js');
    process.exit(1);
  }
}

masterSync();
