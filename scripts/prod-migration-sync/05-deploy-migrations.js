#!/usr/bin/env node
/**
 * 05-deploy-migrations.js
 * הרצת prisma migrate deploy לסנכרון מיגרציות חדשות
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/05-deploy-migrations.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function deployMigrations() {
  console.log('🚀 Deploy מיגרציות ל-Production\n');

  try {
    console.log('📋 בדיקת סטטוס לפני Deploy...\n');
    
    // הרצת prisma migrate status
    try {
      const { stdout: statusOut } = await execAsync('npx prisma migrate status', {
        env: { ...process.env }
      });
      console.log(statusOut);
    } catch (error) {
      console.log('⚠️  סטטוס לא זמין - ממשיך ל-Deploy...\n');
    }

    // הרצת prisma migrate deploy
    console.log('🔄 מריץ prisma migrate deploy...\n');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      env: { ...process.env }
    });

    console.log(stdout);
    if (stderr) {
      console.log('⚠️  Warnings:', stderr);
    }

    console.log('\n✅ Deploy הושלם בהצלחה!\n');
    console.log('💡 צעד הבא: הרץ סקריפט 06 לאימות התוצאה\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה ב-Deploy:', error.message);
    if (error.stdout) console.log('\nOutput:', error.stdout);
    if (error.stderr) console.log('\nErrors:', error.stderr);
    process.exit(1);
  }
}

deployMigrations();
